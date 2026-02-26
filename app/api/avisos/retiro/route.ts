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

function extractPhoneFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const tagged = notes.match(/\[TEL:([0-9]+)\]/i);
  return tagged?.[1] ?? null;
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

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get("q") ?? "").trim();
    const filter = (searchParams.get("filter") ?? "yesterday").trim();
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
        .limit(1000);
      clientIdsByVehicle = Array.from(
        new Set((matchedVehicles ?? []).map((row) => row.client_id)),
      );

      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(1000);
      clientIdsByClientData = Array.from(
        new Set((matchedClients ?? []).map((row) => row.id)),
      );
    }

    const needsClientSideFilter = filter === "pending";

    let query = supabase
      .from("client_procedures")
      .select(
        "id, client_id, created_at, notes, paid, total_amount, amount_paid, clients(id, first_name, last_name, phone), procedure_types(id, code, display_name)",
        { count: "exact" },
      )
      .in("procedure_type_id", targetProcedureTypeIds)
      .order("created_at", { ascending: false });

    if (filter === "yesterday") {
      const now = new Date();
      const yesterdayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0),
      );
      const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      );
      query = query.gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString());
    }

    if (!needsClientSideFilter) {
      query = query.range(from, to);
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

    const { data, error, count } = await query;
    if (error) {
      console.error("GET /api/avisos/retiro error:", error);
      return NextResponse.json(
        { error: "No se pudieron obtener los tramites para retiro." },
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
        receivedAt: string | null;
        notifiedAt: string | null;
        pickedUpAt: string | null;
      }
    >();

    if (procedureIds.length > 0) {
      const { data: statuses } = await supabase
        .from("procedure_delivery_status")
        .select("procedure_id, status, received_at, notified_at, picked_up_at")
        .in("procedure_id", procedureIds);

      statusesByProcedure = new Map(
        (statuses ?? []).map((item: any) => [
          item.procedure_id,
          {
            status: item.status,
            receivedAt: item.received_at,
            notifiedAt: item.notified_at,
            pickedUpAt: item.picked_up_at,
          },
        ]),
      );
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

    const mapped = procedures.map((row: any) => {
      const clientId = row.client_id;
      const vehicle = clientId
        ? resolveVehicle(row.notes, vehiclesByClient.get(clientId) ?? [])
        : null;
      const statusData = statusesByProcedure.get(row.id);
      return {
        id: row.id,
        createdAt: row.created_at,
        notes: row.notes,
        paid: row.paid,
        totalAmount: row.total_amount,
        amountPaid: row.amount_paid,
        status: statusData?.status ?? "PENDIENTE_RECEPCION",
        receivedAt: statusData?.receivedAt ?? null,
        notifiedAt: statusData?.notifiedAt ?? null,
        pickedUpAt: statusData?.pickedUpAt ?? null,
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
      };
    });

    const filtered = filter === "pending"
      ? mapped.filter((item: any) => {
          const hasVehicleData =
            Boolean(item.vehicle?.domain?.trim()) &&
            Boolean(item.vehicle?.brand?.trim()) &&
            Boolean(item.vehicle?.model?.trim());
          return item.status !== "RETIRADO" && hasVehicleData;
        })
      : mapped;

    const paged = needsClientSideFilter
      ? filtered.slice(from, to + 1)
      : filtered;

    const total = needsClientSideFilter
      ? filtered.length
      : (count ?? filtered.length);

    return NextResponse.json({
      data: paged,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/avisos/retiro error:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los tramites para retiro." },
      { status: 500 },
    );
  }
}

