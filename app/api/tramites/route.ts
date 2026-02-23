import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get("q") ?? "").trim();
    const date = (searchParams.get("date") ?? "").trim();
    const showAll = searchParams.get("all") === "1";
    const searchMode = q.length > 0;
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1),
      100,
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let clientIdsByDomain: string[] = [];
    let clientIdsByClientData: string[] = [];
    if (q) {
      const { data: matchedVehicles } = await supabase
        .from("vehicles")
        .select("client_id")
        .or(`domain.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(500);

      clientIdsByDomain = Array.from(
        new Set((matchedVehicles ?? []).map((row) => row.client_id)),
      );

      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`,
        )
        .limit(500);

      clientIdsByClientData = Array.from(
        new Set((matchedClients ?? []).map((row) => row.id)),
      );
    }

    let query = supabase
      .from("client_procedures")
      .select(
        "id, created_at, paid, total_amount, amount_paid, notes, clients(id, first_name, last_name, phone), procedure_types(id, display_name), distributors(id, name)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    // Si hay busqueda de texto, siempre buscamos en todo el historial (sin filtro por fecha).
    if (!showAll && !searchMode && date) {
      const { start, end } = getDateRange(date);
      query = query.gte("created_at", start).lt("created_at", end);
    }

    if (q) {
      const allClientIds = Array.from(
        new Set([...clientIdsByDomain, ...clientIdsByClientData]),
      );

      if (allClientIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
        });
      }

      query = query.in("client_id", allClientIds);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("GET /api/tramites error:", error);
      return NextResponse.json(
        {
          error: "No se pudieron obtener los tramites.",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    const procedures = data ?? [];
    const clientIds = Array.from(
      new Set(
        procedures
          .map((row: any) => row.clients?.id)
          .filter((id: string | null | undefined) => Boolean(id)),
      ),
    ) as string[];

    let vehiclesByClient = new Map<string, { brand: string; model: string; domain: string }[]>();
    if (clientIds.length > 0) {
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("client_id, brand, model, domain")
        .in("client_id", clientIds);

      vehiclesByClient = (vehicles ?? []).reduce((acc, row: any) => {
        const current = acc.get(row.client_id) ?? [];
        current.push({ brand: row.brand, model: row.model, domain: row.domain });
        acc.set(row.client_id, current);
        return acc;
      }, new Map<string, { brand: string; model: string; domain: string }[]>());
    }

    const mapped = procedures.map((row: any) => {
      const clientId = row.clients?.id;
      const firstVehicle = clientId ? vehiclesByClient.get(clientId)?.[0] : null;
      return {
        id: row.id,
        createdAt: row.created_at,
        notes: row.notes,
        paid: row.paid,
        totalAmount: row.total_amount,
        amountPaid: row.amount_paid,
        client: row.clients
          ? {
              id: row.clients.id,
              firstName: row.clients.first_name,
              lastName: row.clients.last_name,
              phone: row.clients.phone,
            }
          : null,
        vehicle: firstVehicle
          ? {
              brand: firstVehicle.brand,
              model: firstVehicle.model,
              domain: firstVehicle.domain,
            }
          : null,
        procedureType: row.procedure_types
          ? {
              id: row.procedure_types.id,
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

    return NextResponse.json({
      data: mapped,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("GET /api/tramites error:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los tramites." },
      { status: 500 },
    );
  }
}
