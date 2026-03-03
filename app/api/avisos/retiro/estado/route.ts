import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  procedureId: z.string().min(1).optional(),
  procedureIds: z.array(z.string().min(1)).min(1).optional(),
  action: z.enum(["received", "notified", "retired"]),
  amountPaid: z.number().min(0).optional(),
}).refine(
  (value) => Boolean(value.procedureId) || Boolean(value.procedureIds?.length),
  {
    message: "Debes enviar procedureId o procedureIds.",
    path: ["procedureId"],
  },
);

async function updateRetiredAmount(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  procedureId: string,
  amountPaid: number,
) {
  const { data: procedure, error: procedureFetchError } = await supabase
    .from("client_procedures")
    .select("id, total_amount, amount_paid")
    .eq("id", procedureId)
    .single();

  if (procedureFetchError || !procedure) {
    return {
      ok: false,
      error: "No se pudo obtener el tramite para actualizar el pago.",
    } as const;
  }

  const previousPaid = Number(procedure.amount_paid ?? 0);
  const total = Number(procedure.total_amount ?? 0);
  const paidDelta = Number(amountPaid ?? 0);
  const newAmountPaid = previousPaid + paidDelta;
  const isPaid = total > 0 ? newAmountPaid >= total : newAmountPaid > 0;

  const { error: procedureUpdateError } = await supabase
    .from("client_procedures")
    .update({
      amount_paid: newAmountPaid,
      paid: isPaid,
    })
    .eq("id", procedureId);

  if (procedureUpdateError) {
    return {
      ok: false,
      error: "No se pudo actualizar el monto abonado del tramite.",
    } as const;
  }

  return { ok: true } as const;
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { procedureId, procedureIds, action, amountPaid } = parsed.data;
    const uniqueProcedureIds = Array.from(
      new Set(procedureIds?.length ? procedureIds : procedureId ? [procedureId] : []),
    );

    if (uniqueProcedureIds.length === 0) {
      return NextResponse.json({ error: "No se informaron tramites." }, { status: 400 });
    }

    let targetProcedureIds = uniqueProcedureIds;
    if (action !== "retired") {
      const { data: currentStatuses } = await supabase
        .from("procedure_delivery_status")
        .select("procedure_id, status")
        .in("procedure_id", uniqueProcedureIds);

      const retiredIds = new Set(
        (currentStatuses ?? [])
          .filter((row) => row.status === "RETIRADO")
          .map((row) => row.procedure_id),
      );
      targetProcedureIds = uniqueProcedureIds.filter((id) => !retiredIds.has(id));
    }

    if (targetProcedureIds.length === 0) {
      return NextResponse.json(
        { error: "Los tramites seleccionados ya estan retirados." },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown>[] = targetProcedureIds.map((id) => ({
      procedure_id: id,
      updated_at: nowIso,
    }));

    if (action === "received") {
      for (const row of payload) {
        row.status = "RECIBIDO";
        row.received_at = nowIso;
      }
    }

    if (action === "notified") {
      for (const row of payload) {
        row.status = "AVISADO_RETIRO";
        row.notified_at = nowIso;
      }
    }

    if (action === "retired") {
      for (const row of payload) {
        row.status = "RETIRADO";
        row.picked_up_at = nowIso;
      }
    }

    const { error } = await supabase
      .from("procedure_delivery_status")
      .upsert(payload, { onConflict: "procedure_id" });

    if (error) {
      console.error("POST /api/avisos/retiro/estado error:", error);
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar estado de retiro. Ejecuta el SQL de procedure_delivery_status.",
        },
        { status: 500 },
      );
    }

    if (action === "retired") {
      for (const id of targetProcedureIds) {
        const result = await updateRetiredAmount(supabase, id, Number(amountPaid ?? 0));
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ data: { ok: true, updated: targetProcedureIds.length } });
  } catch (error) {
    console.error("POST /api/avisos/retiro/estado error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar estado de retiro." },
      { status: 500 },
    );
  }
}
