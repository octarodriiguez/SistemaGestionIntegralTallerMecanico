import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

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

const updatePaymentSchema = z.object({
  procedureId: z.string().uuid("procedureId invalido."),
  totalAmount: z.number().min(0, "Total invalido."),
  amountPaid: z.number().min(0, "Monto abonado invalido."),
});

const deleteProcedureSchema = z.object({
  procedureId: z.string().uuid("procedureId invalido."),
});

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

    const fullSelect =
      "id, created_at, paid, total_amount, amount_paid, notes, clients(id, first_name, last_name, phone), procedure_types(id, code, display_name), distributors(id, name)";
    const fallbackSelect =
      "id, created_at, notes, clients(id, first_name, last_name, phone), procedure_types(id, code, display_name), distributors(id, name)";

    let query = supabase
      .from("client_procedures")
      .select(fullSelect, { count: "exact" })
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

    let data: any[] | null = null;
    let error: any = null;
    let count: number | null = null;
    {
      const result: any = await query;
      data = result.data;
      error = result.error;
      count = result.count;
    }

    // Compatibilidad con esquemas viejos en produccion donde aun no existen
    // columnas monetarias agregadas al catalogo de tramites.
    if (error?.code === "42703") {
      let fallbackQuery = supabase
        .from("client_procedures")
        .select(fallbackSelect, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!showAll && !searchMode && date) {
        const { start, end } = getDateRange(date);
        fallbackQuery = fallbackQuery.gte("created_at", start).lt("created_at", end);
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
        fallbackQuery = fallbackQuery.in("client_id", allClientIds);
      }

      const fallbackResult: any = await fallbackQuery;
      data = fallbackResult.data;
      error = fallbackResult.error;
      count = fallbackResult.count;
    }

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
      const firstVehicle = clientId
        ? resolveVehicle(row.notes, vehiclesByClient.get(clientId) ?? [])
        : null;
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

export async function PATCH(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json();
    const parsed = updatePaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 },
      );
    }

    const { procedureId, totalAmount, amountPaid } = parsed.data;
    if (amountPaid > totalAmount) {
      return NextResponse.json(
        { error: "El monto abonado no puede ser mayor al total." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("client_procedures")
      .update({
        total_amount: totalAmount,
        amount_paid: amountPaid,
        paid: totalAmount > 0 ? amountPaid >= totalAmount : false,
      })
      .eq("id", procedureId)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "No se pudo actualizar el pago.", details: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Tramite no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/tramites error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el pago." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json();
    const parsed = deleteProcedureSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("client_procedures")
      .delete()
      .eq("id", parsed.data.procedureId);

    if (error) {
      return NextResponse.json(
        { error: "No se pudo eliminar el tramite.", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tramites error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el tramite." },
      { status: 500 },
    );
  }
}
