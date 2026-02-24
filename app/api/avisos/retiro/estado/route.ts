import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  procedureId: z.string().min(1),
  action: z.enum(["received", "notified", "retired"]),
  amountPaid: z.number().min(0).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { procedureId, action, amountPaid } = parsed.data;

    const payload: Record<string, unknown> = {
      procedure_id: procedureId,
      updated_at: nowIso,
    };

    if (action === "received") {
      payload.status = "RECIBIDO";
      payload.received_at = nowIso;
    }

    if (action === "notified") {
      payload.status = "AVISADO_RETIRO";
      payload.notified_at = nowIso;
    }

    if (action === "retired") {
      payload.status = "RETIRADO";
      payload.picked_up_at = nowIso;
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
      const { data: procedure, error: procedureFetchError } = await supabase
        .from("client_procedures")
        .select("id, total_amount, amount_paid")
        .eq("id", procedureId)
        .single();

      if (procedureFetchError || !procedure) {
        console.error("POST /api/avisos/retiro/estado procedure fetch error:", procedureFetchError);
        return NextResponse.json(
          { error: "No se pudo obtener el tramite para actualizar el pago." },
          { status: 500 },
        );
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
        console.error("POST /api/avisos/retiro/estado procedure update error:", procedureUpdateError);
        return NextResponse.json(
          { error: "No se pudo actualizar el monto abonado del tramite." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("POST /api/avisos/retiro/estado error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar estado de retiro." },
      { status: 500 },
    );
  }
}

