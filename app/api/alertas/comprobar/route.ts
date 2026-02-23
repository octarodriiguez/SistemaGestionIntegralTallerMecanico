import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  fetchEnargasLastOperationDate,
  sameMonthYearFromStrings,
} from "@/lib/enargas-scraper";

const TARGET_CODES = ["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"];

function getMonthRange(date: string) {
  const [yearText, monthText] = date.slice(0, 7).split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json().catch(() => ({}));

    const q = (body?.q ?? "").toString().trim();
    const date = (body?.date ?? "").toString().trim();
    const month = (body?.month ?? "").toString().trim();
    const showAll = body?.all === true;
    const searchMode = q.length > 0;

    const { data: procedureTypes } = await supabase
      .from("procedure_types")
      .select("id")
      .in("code", TARGET_CODES);

    const targetProcedureTypeIds = (procedureTypes ?? []).map((item) => item.id);
    if (targetProcedureTypeIds.length === 0) {
      return NextResponse.json({ data: { checked: 0 } });
    }

    let clientIdsByVehicle: string[] = [];
    let clientIdsByClientData: string[] = [];
    if (q) {
      const { data: matchedVehicles } = await supabase
        .from("vehicles")
        .select("client_id")
        .or(`domain.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(1200);
      clientIdsByVehicle = Array.from(
        new Set((matchedVehicles ?? []).map((row) => row.client_id)),
      );

      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`,
        )
        .limit(1200);
      clientIdsByClientData = Array.from(
        new Set((matchedClients ?? []).map((row) => row.id)),
      );
    }

    let query = supabase
      .from("client_procedures")
      .select("id, client_id, created_at")
      .in("procedure_type_id", targetProcedureTypeIds)
      .order("created_at", { ascending: false });

    if (!showAll && !searchMode) {
      if (month) {
        const range = getMonthRange(month);
        if (range) {
          query = query.gte("created_at", range.start).lt("created_at", range.end);
        }
      } else if (date) {
        const range = getMonthRange(date);
        if (range) {
          query = query.gte("created_at", range.start).lt("created_at", range.end);
        }
      }
    }

    if (q) {
      const allClientIds = Array.from(
        new Set([...clientIdsByVehicle, ...clientIdsByClientData]),
      );
      if (allClientIds.length === 0) {
        return NextResponse.json({ data: { checked: 0 } });
      }
      query = query.in("client_id", allClientIds);
    }

    const { data: procedures, error } = await query.limit(1200);
    if (error) {
      console.error("POST /api/alertas/comprobar error:", error);
      return NextResponse.json(
        { error: "No se pudo comprobar vencimientos." },
        { status: 500 },
      );
    }

    const procedureRows = procedures ?? [];
    if (procedureRows.length === 0) {
      return NextResponse.json({ data: { checked: 0, pending: 0, noCorrespond: 0 } });
    }

    const clientIds = Array.from(
      new Set(procedureRows.map((item: any) => item.client_id).filter(Boolean)),
    ) as string[];

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("client_id, domain")
      .in("client_id", clientIds);

    const domainsByClient = new Map<string, string[]>();
    for (const item of vehicles ?? []) {
      if (!item.domain) continue;
      const list = domainsByClient.get(item.client_id) ?? [];
      if (!list.includes(item.domain)) {
        list.push(item.domain);
      }
      domainsByClient.set(item.client_id, list);
    }

    const procedureIds = procedureRows.map((item: any) => item.id);
    const { data: existingStatuses } = await supabase
      .from("procedure_alert_status")
      .select("procedure_id, status")
      .in("procedure_id", procedureIds);

    const existingStatusByProcedure = new Map<string, string>(
      (existingStatuses ?? []).map((item: any) => [item.procedure_id, item.status]),
    );

    const uniqueDomains = Array.from(
      new Set(
        procedureRows
          .flatMap((item: any) => domainsByClient.get(item.client_id) ?? [])
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const domainResultMap = new Map<
      string,
      { lastOperationDate: string | null; error?: string }
    >();

    // Limite de seguridad para no disparar scraping masivo accidental.
    const domainsToCheck = uniqueDomains.slice(0, 200);
    for (const domain of domainsToCheck) {
      const result = await fetchEnargasLastOperationDate(domain);
      domainResultMap.set(domain, {
        lastOperationDate: result.lastOperationDate,
        error: result.error,
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const nowIso = new Date().toISOString();
    const rows = procedureRows.map((item: any) => {
      const clientDomains = domainsByClient.get(item.client_id) ?? [];
      const selectedDomain =
        clientDomains.find((candidate) => {
          const hit = domainResultMap.get(candidate);
          return Boolean(hit?.lastOperationDate);
        }) ??
        clientDomains[0] ??
        null;
      const domainResult = selectedDomain ? domainResultMap.get(selectedDomain) : undefined;
      const enargasDate = domainResult?.lastOperationDate ?? null;
      const matchesMonthYear = sameMonthYearFromStrings(enargasDate, item.created_at);
      const previousStatus = existingStatusByProcedure.get(item.id);

      let status = matchesMonthYear
        ? "PENDIENTE_DE_AVISAR"
        : "NO_CORRESPONDE_AVISAR";

      // Si ya fue avisado y sigue correspondiendo avisar, conservamos AVISADO.
      if (matchesMonthYear && previousStatus === "AVISADO") {
        status = "AVISADO";
      }

      return {
        procedure_id: item.id,
        status,
        enargas_last_operation_date: enargasDate
          ? (() => {
              const [d, m, y] = enargasDate.split("/");
              return `${y}-${m}-${d}`;
            })()
          : null,
        last_checked_at: nowIso,
        notes: domainResult?.error
          ? `Error ENARGAS: ${domainResult.error}`
          : selectedDomain
            ? `Dominio consultado: ${selectedDomain}`
            : "Sin dominio asociado",
      };
    });

    const { error: upsertError } = await supabase
      .from("procedure_alert_status")
      .upsert(rows, { onConflict: "procedure_id" });

    if (upsertError) {
      console.error("POST /api/alertas/comprobar upsert error:", upsertError);
      return NextResponse.json(
        {
          error:
            "No se pudo guardar el estado de comprobacion. Ejecuta el SQL de alertas_status.",
        },
        { status: 500 },
      );
    }

    const pending = rows.filter((item) => item.status === "PENDIENTE_DE_AVISAR").length;
    const noCorrespond = rows.filter(
      (item) => item.status === "NO_CORRESPONDE_AVISAR",
    ).length;

    return NextResponse.json({
      data: {
        checked: rows.length,
        pending,
        noCorrespond,
        domainsChecked: domainsToCheck.length,
        domainsSkippedByLimit: Math.max(uniqueDomains.length - domainsToCheck.length, 0),
      },
    });
  } catch (error) {
    console.error("POST /api/alertas/comprobar error:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar vencimientos." },
      { status: 500 },
    );
  }
}
