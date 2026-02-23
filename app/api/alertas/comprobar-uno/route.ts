import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  fetchEnargasLastOperationDate,
  sameMonthYearFromStrings,
} from "@/lib/enargas-scraper";

const schema = z.object({
  procedureId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const { data: procedure, error: procedureError } = await supabase
      .from("client_procedures")
      .select("id, client_id, created_at")
      .eq("id", parsed.data.procedureId)
      .single();

    if (procedureError || !procedure) {
      return NextResponse.json({ error: "Tramite no encontrado." }, { status: 404 });
    }

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("domain")
      .eq("client_id", procedure.client_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const domains = Array.from(
      new Set(
        (vehicles ?? [])
          .map((item) => (item.domain ?? "").trim())
          .filter((value) => value.length > 0),
      ),
    );
    const nowIso = new Date().toISOString();

    if (domains.length === 0) {
      const { error: upsertWithoutDomainError } = await supabase
        .from("procedure_alert_status")
        .upsert(
          {
            procedure_id: procedure.id,
            status: "NO_CORRESPONDE_AVISAR",
            enargas_last_operation_date: null,
            last_checked_at: nowIso,
            notes: "Sin dominio asociado",
          },
          { onConflict: "procedure_id" },
        );

      if (upsertWithoutDomainError) {
        return NextResponse.json(
          { error: "No se pudo guardar estado del tramite." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        data: {
          procedureId: procedure.id,
          status: "NO_CORRESPONDE_AVISAR",
          enargasLastOperationDate: null,
          notes: "Sin dominio asociado",
        },
      });
    }

    let scrape = await fetchEnargasLastOperationDate(domains[0]);
    for (let i = 1; i < domains.length && !scrape.lastOperationDate; i += 1) {
      scrape = await fetchEnargasLastOperationDate(domains[i]);
    }
    const matchesMonthYear = sameMonthYearFromStrings(
      scrape.lastOperationDate,
      procedure.created_at,
    );

    const status = matchesMonthYear
      ? "PENDIENTE_DE_AVISAR"
      : "NO_CORRESPONDE_AVISAR";

    const enargasDateIso = scrape.lastOperationDate
      ? (() => {
          const [d, m, y] = scrape.lastOperationDate.split("/");
          return `${y}-${m}-${d}`;
        })()
      : null;

    const { error: upsertError } = await supabase
      .from("procedure_alert_status")
      .upsert(
        {
          procedure_id: procedure.id,
          status,
          enargas_last_operation_date: enargasDateIso,
          last_checked_at: nowIso,
          notes: scrape.error
            ? `Error ENARGAS: ${scrape.error}`
            : `Dominio consultado: ${scrape.domain}`,
        },
        { onConflict: "procedure_id" },
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "No se pudo guardar estado del tramite." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        procedureId: procedure.id,
        status,
        enargasLastOperationDate: scrape.lastOperationDate,
        notes: scrape.error ?? `Dominio consultado: ${scrape.domain}`,
      },
    });
  } catch (error) {
    console.error("POST /api/alertas/comprobar-uno error:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar el tramite." },
      { status: 500 },
    );
  }
}
