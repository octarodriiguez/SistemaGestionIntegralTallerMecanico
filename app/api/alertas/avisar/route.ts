import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  procedureId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("procedure_alert_status").upsert(
      {
        procedure_id: parsed.data.procedureId,
        status: "AVISADO",
        notified_at: nowIso,
        last_checked_at: nowIso,
      },
      { onConflict: "procedure_id" },
    );

    if (error) {
      console.error("POST /api/alertas/avisar error:", error);
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar el estado de aviso. Ejecuta el SQL de alertas_status.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("POST /api/alertas/avisar error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado." },
      { status: 500 },
    );
  }
}
