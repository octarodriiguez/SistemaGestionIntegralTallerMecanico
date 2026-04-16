import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  fetchEnargasLastOperationDate,
  sameMonthYearFromStrings,
} from "@/lib/enargas-scraper";

// Vercel: extend function timeout (max 300s on Pro, 60s on Hobby)
export const maxDuration = 300;
// Use Node.js runtime — required for Playwright/Chromium
export const runtime = "nodejs";

const TARGET_CODES = ["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"];

function extractDomainFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const tagged = notes.match(/\[DOMINIO:([A-Z0-9-]+)\]/i);
  if (tagged?.[1]) return tagged[1].toUpperCase();
  const legacy = notes.match(/dominio:\s*([A-Z0-9-]+)/i);
  if (legacy?.[1]) return legacy[1].toUpperCase();
  return null;
}

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
    // If specific procedure IDs are passed, only check those (page-scoped mode)
    const scopedIds: string[] | null = Array.isArray(body?.procedureIds) && body.procedureIds.length > 0
      ? body.procedureIds
      : null;

    const { data: procedureTypes } = await supabase
      .from("procedure_types")
      .select("id")
      .in("code", TARGET_CODES);

    const targetProcedureTypeIds = (procedureTypes ?? []).map((item) => item.id);
    if (targetProcedureTypeIds.length === 0) {
      return NextResponse.json({ data: { checked: 0 } });
    }

    let procedureRows: any[] = [];

    if (scopedIds) {
      // Page-scoped: fetch only the specific procedures visible on screen
      const { data: scopedProcedures, error: scopedError } = await supabase
        .from("client_procedures")
        .select("id, client_id, created_at, notes")
        .in("id", scopedIds);
      if (scopedError) {
        return NextResponse.json({ error: "No se pudo comprobar vencimientos." }, { status: 500 });
      }
      procedureRows = scopedProcedures ?? [];
    } else {
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
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(1200);
        clientIdsByClientData = Array.from(
          new Set((matchedClients ?? []).map((row) => row.id)),
        );
      }

      let query = supabase
        .from("client_procedures")
        .select("id, client_id, created_at, notes")
        .in("procedure_type_id", targetProcedureTypeIds)
        .order("created_at", { ascending: false });

      if (!showAll && !searchMode) {
        if (month) {
          const range = getMonthRange(month);
          if (range) query = query.gte("created_at", range.start).lt("created_at", range.end);
        } else if (date) {
          const range = getMonthRange(date);
          if (range) query = query.gte("created_at", range.start).lt("created_at", range.end);
        }
      }

      if (q) {
        const allClientIds = Array.from(new Set([...clientIdsByVehicle, ...clientIdsByClientData]));
        if (allClientIds.length === 0) {
          return NextResponse.json({ data: { checked: 0 } });
        }
        query = query.in("client_id", allClientIds);
      }

      const { data: procedures, error } = await query.limit(1200);
      if (error) {
        console.error("POST /api/alertas/comprobar error:", error);
        return NextResponse.json({ error: "No se pudo comprobar vencimientos." }, { status: 500 });
      }
      procedureRows = procedures ?? [];
    }
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

    const selectedDomainByProcedure = new Map<string, string>();
    for (const item of procedureRows as any[]) {
      const domainFromNotes = extractDomainFromNotes(item.notes);
      const clientDomains = domainsByClient.get(item.client_id) ?? [];
      const selectedDomain = (domainFromNotes || clientDomains[0] || "").toUpperCase();
      if (selectedDomain) selectedDomainByProcedure.set(item.id, selectedDomain);
    }

    const uniqueDomains = Array.from(new Set(Array.from(selectedDomainByProcedure.values())));

    const domainResultMap = new Map<
      string,
      { lastOperationDate: string | null; error?: string }
    >();

    const domainsToCheck = uniqueDomains.slice(0, 200);
    let stopped = false;

    for (const domain of domainsToCheck) {
      // Check if the client aborted the request
      if (request.signal?.aborted) {
        stopped = true;
        console.log(`[ENARGAS] Consulta detenida por el usuario en dominio=${domain}`);
        break;
      }

      const result = await fetchEnargasLastOperationDate(domain);
      domainResultMap.set(domain, {
        lastOperationDate: result.lastOperationDate,
        error: result.error,
      });

      if (request.signal?.aborted) {
        stopped = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Only build rows for procedures whose domain was actually checked
    const checkedDomains = new Set(domainResultMap.keys());
    const rowsToUpsert = procedureRows
      .filter((item: any) => {
        const domain = selectedDomainByProcedure.get(item.id);
        return domain ? checkedDomains.has(domain) : true;
      })
      .map((item: any) => {
        const selectedDomain = selectedDomainByProcedure.get(item.id) ?? null;
        const domainResult = selectedDomain ? domainResultMap.get(selectedDomain) : undefined;
        const enargasDate = domainResult?.lastOperationDate ?? null;
        const matchesMonthYear = sameMonthYearFromStrings(enargasDate, item.created_at);
        const previousStatus = existingStatusByProcedure.get(item.id);

        let status = matchesMonthYear ? "PENDIENTE_DE_AVISAR" : "NO_CORRESPONDE_AVISAR";

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
          last_checked_at: new Date().toISOString(),
          notes: domainResult?.error
            ? `Error ENARGAS: ${domainResult.error}`
            : selectedDomain
              ? `Dominio consultado: ${selectedDomain}`
              : "Sin dominio asociado",
        };
      });

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("procedure_alert_status")
        .upsert(rowsToUpsert, { onConflict: "procedure_id" });

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
    }

    const pending = rowsToUpsert.filter((item) => item.status === "PENDIENTE_DE_AVISAR").length;
    const noCorrespond = rowsToUpsert.filter(
      (item) => item.status === "NO_CORRESPONDE_AVISAR",
    ).length;

    return NextResponse.json({
      data: {
        checked: rowsToUpsert.length,
        pending,
        noCorrespond,
        domainsChecked: domainResultMap.size,
        domainsSkippedByLimit: Math.max(uniqueDomains.length - domainsToCheck.length, 0),
        stopped,
      },
    });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      return NextResponse.json({ data: { checked: 0, stopped: true } });
    }
    console.error("POST /api/alertas/comprobar error:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar vencimientos." },
      { status: 500 },
    );
  }
}
