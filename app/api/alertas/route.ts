import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const TARGET_CODES = ["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"];

function extractDomainFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const tagged = notes.match(/\[DOMINIO:([A-Z0-9-]+)\]/i);
  if (tagged?.[1]) return tagged[1].toUpperCase();
  const legacy = notes.match(/dominio:\s*([A-Z0-9-]+)/i);
  if (legacy?.[1]) return legacy[1].toUpperCase();
  return null;
}

function resolveVehicle(
  notes: string | null | undefined,
  vehicles: { brand: string; model: string; domain: string }[],
) {
  if (!vehicles.length) return null;
  const domainFromNotes = extractDomainFromNotes(notes);
  if (!domainFromNotes) return vehicles[0];
  return (
    vehicles.find((item) => (item.domain || "").toUpperCase() === domainFromNotes) ??
    vehicles[0]
  );
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

function extractPhoneFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const tagged = notes.match(/\[TEL:([0-9]+)\]/i);
  return tagged?.[1] ?? null;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get("q") ?? "").trim();
    const date = (searchParams.get("date") ?? "").trim();
    const month = (searchParams.get("month") ?? "").trim();
    const showAll = searchParams.get("all") === "1";
    const status = (searchParams.get("status") ?? "").trim();
    const searchMode = q.length > 0;
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1),
      100,
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: procedureTypes } = await supabase
      .from("procedure_types")
      .select("id, code")
      .in("code", TARGET_CODES);

    const targetProcedureTypeIds = (procedureTypes ?? []).map((item) => item.id);
    if (targetProcedureTypeIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 1 },
      });
    }

    let clientIdsByVehicle: string[] = [];
    let clientIdsByClientData: string[] = [];
    if (q) {
      const { data: matchedVehicles } = await supabase
        .from("vehicles")
        .select("client_id")
        .or(`domain.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(800);
      clientIdsByVehicle = Array.from(
        new Set((matchedVehicles ?? []).map((row) => row.client_id)),
      );

      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`,
        )
        .limit(800);
      clientIdsByClientData = Array.from(
        new Set((matchedClients ?? []).map((row) => row.id)),
      );
    }

    let query = supabase
      .from("client_procedures")
      .select(
        "id, client_id, created_at, notes, clients(id, first_name, last_name, phone), procedure_types(id, code, display_name), distributors(id, name)",
        { count: "exact" },
      )
      .in("procedure_type_id", targetProcedureTypeIds)
      .order("created_at", { ascending: false })
      .range(from, to);

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
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 1 },
        });
      }
      query = query.in("client_id", allClientIds);
    }

    let { data, error, count } = await query;
    if (error) {
      console.error("GET /api/alertas error:", error);
      return NextResponse.json(
        { error: "No se pudieron obtener las alertas.", details: error.message },
        { status: 500 },
      );
    }

    const procedures = data ?? [];
    const procedureIds = procedures.map((row: any) => row.id);
    const clientIds = Array.from(
      new Set(procedures.map((row: any) => row.client_id).filter(Boolean)),
    ) as string[];

    let statusesByProcedure = new Map<
      string,
      {
        status: string;
        notifiedAt: string | null;
        lastCheckedAt: string | null;
        enargasLastOperationDate: string | null;
      }
    >();

    if (procedureIds.length > 0) {
      const { data: statuses, error: statusesError } = await supabase
        .from("procedure_alert_status")
        .select("procedure_id, status, notified_at, last_checked_at, enargas_last_operation_date")
        .in("procedure_id", procedureIds);

      if (!statusesError) {
        statusesByProcedure = new Map(
          (statuses ?? []).map((item: any) => [
            item.procedure_id,
            {
              status: item.status,
              notifiedAt: item.notified_at,
              lastCheckedAt: item.last_checked_at,
              enargasLastOperationDate: item.enargas_last_operation_date,
            },
          ]),
        );
      }
    }

    let vehiclesByClient = new Map<string, { brand: string; model: string; domain: string }[]>();
    if (clientIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("client_id, brand, model, domain")
        .in("client_id", clientIds);

      vehiclesByClient = (vehicles ?? []).reduce((acc, row: any) => {
        const list = acc.get(row.client_id) ?? [];
        list.push({ brand: row.brand, model: row.model, domain: row.domain });
        acc.set(row.client_id, list);
        return acc;
      }, new Map<string, { brand: string; model: string; domain: string }[]>());
    }

    let mapped = procedures.map((row: any) => {
      const clientId = row.client_id;
      const vehicle = clientId
        ? resolveVehicle(row.notes, vehiclesByClient.get(clientId) ?? [])
        : null;
      const statusData = statusesByProcedure.get(row.id);
      return {
        id: row.id,
        createdAt: row.created_at,
        notes: row.notes,
        status: statusData?.status ?? "PENDIENTE_DE_AVISAR",
        notifiedAt: statusData?.notifiedAt ?? null,
        lastCheckedAt: statusData?.lastCheckedAt ?? null,
        enargasLastOperationDate: statusData?.enargasLastOperationDate ?? null,
        client: row.clients
          ? {
              id: row.clients.id,
              firstName: row.clients.first_name,
              lastName: row.clients.last_name,
              phone: extractPhoneFromNotes(row.notes) ?? row.clients.phone,
            }
          : null,
        vehicle: vehicle ?? null,
        procedureType: row.procedure_types
          ? {
              id: row.procedure_types.id,
              code: row.procedure_types.code,
              displayName: row.procedure_types.display_name,
            }
          : null,
        distributor: row.distributors
          ? {
              id: row.distributors.id,
              name: row.distributors.name,
            }
          : null,
      };
    });

    if (status) {
      mapped = mapped.filter((item) => item.status === status);
      count = mapped.length;
    }

    return NextResponse.json({
      data: mapped,
      pagination: {
        page,
        pageSize,
        total: count ?? mapped.length,
        totalPages: Math.max(Math.ceil((count ?? mapped.length) / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/alertas error:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las alertas." },
      { status: 500 },
    );
  }
}
