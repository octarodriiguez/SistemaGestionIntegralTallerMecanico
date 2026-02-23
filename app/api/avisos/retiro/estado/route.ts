import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  procedureId: z.string().min(1),
  action: z.enum(["received", "notified", "retired"]),
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
    const { procedureId, action } = parsed.data;

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

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("POST /api/avisos/retiro/estado error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar estado de retiro." },
      { status: 500 },
    );
  }
}

