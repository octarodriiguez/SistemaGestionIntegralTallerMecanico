import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const updateSchema = z
  .object({
    action: z.literal("mark_winpec"),
    procedureId: z.string().uuid("procedureId invalido.").optional(),
    procedureIds: z.array(z.string().uuid("procedureId invalido.")).min(1).optional(),
  })
  .refine((value) => Boolean(value.procedureId) || Boolean(value.procedureIds?.length), {
    message: "Debes enviar procedureId o procedureIds.",
    path: ["procedureId"],
  });

type OfficeStatus = "PENDIENTE_CARGA" | "CARGADO_WINPEC";

function normalizeStatus(raw: string | null | undefined): OfficeStatus {
  return raw === "CARGADO_WINPEC" ? "CARGADO_WINPEC" : "PENDIENTE_CARGA";
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const trace = `GET:/api/tramites/oficina:${Date.now()}`;

    const q = (searchParams.get("q") ?? "").trim();
    const status = (searchParams.get("status") ?? "PENDIENTE_CARGA").trim().toUpperCase();
    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1),
      100,
    );

    const validStatusFilter = status === "ALL" || status === "PENDIENTE_CARGA" || status === "CARGADO_WINPEC";
    if (!validStatusFilter) {
      return NextResponse.json({ error: "Filtro de estado invalido." }, { status: 400 });
    }
    console.info("[tramites/oficina]", trace, "params", { q, status, page, pageSize });

    const { data: nonRepairTypes, error: typesError } = await supabase
      .from("procedure_types")
      .select("id")
      .neq("code", "REPARACION_VARIA");

    if (typesError) {
      console.error("GET /api/tramites/oficina types error:", trace, typesError);
      return NextResponse.json({ error: "No se pudo validar tipos de tramite." }, { status: 500 });
    }

    const procedureTypeIds = (nonRepairTypes ?? []).map((row) => row.id);
    if (procedureTypeIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total: 0, totalPages: 1 },
      });
    }

    let clientIdsByDomain: string[] = [];
    let clientIdsByClientData: string[] = [];
    if (q) {
      const { data: matchedVehicles } = await supabase
        .from("vehicles")
        .select("client_id")
        .or(`domain.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`)
        .limit(500);

      clientIdsByDomain = Array.from(new Set((matchedVehicles ?? []).map((row) => row.client_id)));

      const { data: matchedClients } = await supabase
        .from("clients")
        .select("id")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(500);

      clientIdsByClientData = Array.from(new Set((matchedClients ?? []).map((row) => row.id)));
    }

    let query = supabase
      .from("client_procedures")
      .select(
        "id, created_at, notes, paid, total_amount, amount_paid, client_id, clients(id, first_name, last_name, phone), procedure_types(id, code, display_name), distributors(id, name)",
      )
      .in("procedure_type_id", procedureTypeIds)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (q) {
      const allClientIds = Array.from(new Set([...clientIdsByDomain, ...clientIdsByClientData]));
      if (allClientIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 1 },
        });
      }
      query = query.in("client_id", allClientIds);
    }

    const { data: procedures, error: proceduresError } = await query;
    if (proceduresError) {
      console.error("GET /api/tramites/oficina procedures error:", trace, proceduresError);
      return NextResponse.json(
        {
          error: "No se pudieron obtener los pendientes de oficina.",
          details: proceduresError.message,
          code: proceduresError.code,
        },
        { status: 500 },
      );
    }
    console.info("[tramites/oficina]", trace, "procedures_found", procedures?.length ?? 0);

    const procedureIds = (procedures ?? []).map((row) => row.id);
    let statusByProcedure = new Map<string, OfficeStatus>();

    if (procedureIds.length > 0) {
      const procedureIdChunks = chunkArray(procedureIds, 200);
      const officeStatusesAll: Array<{ procedure_id: string; status: string | null }> = [];

      for (const idsChunk of procedureIdChunks) {
        const { data: officeStatuses, error: officeStatusesError } = await supabase
          .from("procedure_office_status")
          .select("procedure_id, status")
          .in("procedure_id", idsChunk);

        if (officeStatusesError) {
          console.error("GET /api/tramites/oficina status error:", trace, officeStatusesError);
          return NextResponse.json(
            {
              error:
                "No se pudo leer procedure_office_status. Ejecuta el SQL 2026-02-23_procedure_office_status.sql.",
              details: officeStatusesError.message,
              code: officeStatusesError.code,
              hint: officeStatusesError.hint ?? null,
            },
            { status: 500 },
          );
        }

        officeStatusesAll.push(...((officeStatuses as Array<{ procedure_id: string; status: string | null }> | null) ?? []));
      }

      console.info(
        "[tramites/oficina]",
        trace,
        "office_statuses_found",
        officeStatusesAll.length,
        "chunks",
        procedureIdChunks.length,
      );

      statusByProcedure = new Map(
        officeStatusesAll.map((row) => [row.procedure_id, normalizeStatus(row.status)]),
      );
    }

    const filtered = (procedures ?? []).filter((row) => {
      const rowStatus = statusByProcedure.get(row.id) ?? "PENDIENTE_CARGA";
      return status === "ALL" ? true : rowStatus === status;
    });

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize;
    const pageRows = filtered.slice(from, to);

    const clientIds = Array.from(
      new Set(
        pageRows
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

    const mapped = pageRows.map((row: any) => {
      const clientId = row.clients?.id;
      const firstVehicle = clientId ? vehiclesByClient.get(clientId)?.[0] : null;
      const rowStatus = statusByProcedure.get(row.id) ?? "PENDIENTE_CARGA";
      return {
        id: row.id,
        createdAt: row.created_at,
        status: rowStatus,
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
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/tramites/oficina error:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los pendientes de oficina." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json();
    const trace = `POST:/api/tramites/oficina:${Date.now()}`;
    console.info("[tramites/oficina]", trace, "payload", json);
    const parsed = updateSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 },
      );
    }

    const procedureIds = Array.from(
      new Set(
        parsed.data.procedureIds?.length
          ? parsed.data.procedureIds
          : parsed.data.procedureId
            ? [parsed.data.procedureId]
            : [],
      ),
    );

    const { data: procedures, error: procedureError } = await supabase
      .from("client_procedures")
      .select("id, procedure_type_id")
      .in("id", procedureIds);

    if (procedureError || !procedures || procedures.length === 0) {
      console.error("POST /api/tramites/oficina procedure error:", trace, procedureError);
      return NextResponse.json({ error: "Tramite no encontrado." }, { status: 404 });
    }
    console.info("[tramites/oficina]", trace, "procedures_found", procedures.length);

    const procedureTypeIds = Array.from(new Set(procedures.map((p) => p.procedure_type_id)));
    const { data: procedureTypes, error: typeError } = await supabase
      .from("procedure_types")
      .select("id, code")
      .in("id", procedureTypeIds);

    if (typeError) {
      console.error("POST /api/tramites/oficina type error:", trace, typeError);
      return NextResponse.json({ error: "No se pudo validar el tipo de tramite." }, { status: 500 });
    }

    const procedureTypeById = new Map((procedureTypes ?? []).map((pt) => [pt.id, pt.code]));
    const hasReparacionVaria = procedures.some(
      (procedure) => procedureTypeById.get(procedure.procedure_type_id) === "REPARACION_VARIA",
    );
    if (hasReparacionVaria) {
      return NextResponse.json(
        { error: "REPARACION_VARIA no se controla en pendientes de oficina." },
        { status: 400 },
      );
    }

    const payload = procedureIds.map((procedureId) => ({
      procedure_id: procedureId,
      status: "CARGADO_WINPEC",
      loaded_to_winpec_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("procedure_office_status")
      .upsert(payload, { onConflict: "procedure_id" });

    if (error) {
      console.error("POST /api/tramites/oficina upsert error:", trace, error);
      return NextResponse.json(
        {
          error:
            "No se pudo actualizar estado de oficina. Ejecuta el SQL 2026-02-23_procedure_office_status.sql.",
          details: error.message,
          code: error.code,
          hint: error.hint ?? null,
        },
        { status: 500 },
      );
    }
    console.info("[tramites/oficina]", trace, "upsert_ok", { count: procedureIds.length });

    return NextResponse.json({ ok: true, data: { updated: procedureIds.length } });
  } catch (error) {
    console.error("POST /api/tramites/oficina error:", error);
    return NextResponse.json({ error: "No se pudo actualizar estado." }, { status: 500 });
  }
}
