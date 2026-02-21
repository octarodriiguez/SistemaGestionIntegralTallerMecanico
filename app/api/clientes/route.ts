import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const createClientSchema = z.object({
  firstName: z.string().trim().min(2, "El nombre es obligatorio."),
  lastName: z.string().trim().min(2, "El apellido es obligatorio."),
  phone: z.string().trim().min(6, "El telefono es obligatorio."),
  procedureTypeId: z.string().trim().min(1, "El tipo de tramite es obligatorio."),
  distributorId: z.string().trim().optional().or(z.literal("")),
  procedureNotes: z.string().trim().optional(),
  paid: z.boolean(),
  amountPaid: z.number().min(0, "El monto abonado no puede ser negativo."),
  email: z
    .string()
    .trim()
    .email("El email no es valido.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  vehicle: z
    .object({
      brand: z.string().trim().min(2),
      model: z.string().trim().min(1),
      domain: z.string().trim().min(6),
      year: z.number().int().min(1950).max(2100).optional(),
      color: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    }),
});

function normalizeDomain(domain: string) {
  return domain.toUpperCase().replace(/\s+/g, "");
}

function mapClient(row: any) {
  const latestProcedure = (row.client_procedures ?? [])[0] ?? null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestProcedure: latestProcedure
      ? {
          id: latestProcedure.id,
          notes: latestProcedure.notes,
          paid: latestProcedure.paid,
          amountPaid: latestProcedure.amount_paid,
          createdAt: latestProcedure.created_at,
          procedureType: latestProcedure.procedure_types
            ? {
                id: latestProcedure.procedure_types.id,
                displayName: latestProcedure.procedure_types.display_name,
                code: latestProcedure.procedure_types.code,
              }
            : null,
          distributor: latestProcedure.distributors
            ? {
                id: latestProcedure.distributors.id,
                name: latestProcedure.distributors.name,
              }
            : null,
        }
      : null,
    vehicles: (row.vehicles ?? []).map((vehicle: any) => ({
      id: vehicle.id,
      clientId: vehicle.client_id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      domain: vehicle.domain,
      color: vehicle.color,
      notes: vehicle.notes,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const supabaseServer = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    let clientIdFilter: string[] = [];

    if (q) {
      const { data: matchedVehicles, error: vehicleSearchError } =
        await supabaseServer
          .from("vehicles")
          .select("client_id")
          .ilike("domain", `%${q.toUpperCase()}%`)
          .limit(200);

      if (vehicleSearchError) {
        console.error("GET /api/clientes vehicle search error:", vehicleSearchError);
        return NextResponse.json(
          { error: "No se pudieron obtener los clientes." },
          { status: 500 },
        );
      }

      clientIdFilter = Array.from(
        new Set((matchedVehicles ?? []).map((row) => row.client_id)),
      );
    }

    let query = supabaseServer
      .from("clients")
      .select(
        "id, first_name, last_name, phone, email, address, notes, created_at, updated_at, vehicles(id, client_id, brand, model, year, domain, color, notes, created_at, updated_at), client_procedures(id, notes, paid, amount_paid, created_at, procedure_types(id, code, display_name), distributors(id, name))",
      )
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .limit(100);

    if (q) {
      const escaped = q.replaceAll(",", "\\,");
      const localFilters = `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`;
      if (clientIdFilter.length > 0) {
        query = query.or(`${localFilters},id.in.(${clientIdFilter.join(",")})`);
      } else {
        query = query.or(localFilters);
      }
    }

    let { data, error } = await query;

    // Compatibilidad: si aun no se ejecutaron las columnas nuevas (paid/amount_paid),
    // hacemos fallback para no romper el listado de clientes.
    if (error?.code === "42703") {
      const fallback = await supabaseServer
        .from("clients")
        .select(
          "id, first_name, last_name, phone, email, address, notes, created_at, updated_at, vehicles(id, client_id, brand, model, year, domain, color, notes, created_at, updated_at), client_procedures(id, notes, created_at, procedure_types(id, code, display_name), distributors(id, name))",
        )
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .limit(100);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("GET /api/clientes error:", error);
      return NextResponse.json(
        {
          error: "No se pudieron obtener los clientes.",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: (data ?? []).map(mapClient) });
  } catch (error) {
    console.error("GET /api/clientes error:", error);
    return NextResponse.json(
      {
        error: "No se pudieron obtener los clientes.",
        details: error instanceof Error ? error.message : "Error inesperado",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabaseServer = getSupabaseServerClient();
    const json = await request.json();
    const parsed = createClientSchema.safeParse(json);

    if (!parsed.success) {
      console.error("POST /api/clientes validation payload:", json);
      console.error("POST /api/clientes validation issues:", parsed.error.issues);
      const firstIssue = parsed.error.issues[0]?.message;
      return NextResponse.json(
        {
          error: firstIssue || "Datos invalidos.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const vehicle = payload.vehicle;

    const { data: procedureType, error: procedureTypeError } = await supabaseServer
      .from("procedure_types")
      .select("id, requires_distributor")
      .eq("id", payload.procedureTypeId)
      .maybeSingle();

    if (procedureTypeError) {
      console.error("POST /api/clientes procedure type check error:", procedureTypeError);
      return NextResponse.json(
        { error: "No se pudo validar el tipo de tramite." },
        { status: 500 },
      );
    }

    if (!procedureType) {
      return NextResponse.json(
        { error: "Tipo de tramite invalido." },
        { status: 400 },
      );
    }

    if (procedureType.requires_distributor && !payload.distributorId) {
      return NextResponse.json(
        { error: "Este tipo de tramite requiere distribuidora." },
        { status: 400 },
      );
    }

    if (payload.paid && payload.amountPaid <= 0) {
      return NextResponse.json(
        { error: "Si esta pagado, el monto abonado debe ser mayor a 0." },
        { status: 400 },
      );
    }

    if (!payload.paid && payload.amountPaid > 0) {
      return NextResponse.json(
        { error: "Si no esta pagado, el monto abonado debe ser 0." },
        { status: 400 },
      );
    }

    if (payload.distributorId) {
      const { data: distributor, error: distributorError } = await supabaseServer
        .from("distributors")
        .select("id")
        .eq("id", payload.distributorId)
        .maybeSingle();

      if (distributorError) {
        console.error("POST /api/clientes distributor check error:", distributorError);
        return NextResponse.json(
          { error: "No se pudo validar la distribuidora." },
          { status: 500 },
        );
      }

      if (!distributor) {
        return NextResponse.json(
          { error: "Distribuidora invalida." },
          { status: 400 },
        );
      }
    }

    const domain = normalizeDomain(vehicle.domain);
    const { data: existingDomain, error: domainError } = await supabaseServer
      .from("vehicles")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (domainError) {
      console.error("POST /api/clientes domain check error:", domainError);
      return NextResponse.json(
        { error: "No se pudo validar el dominio." },
        { status: 500 },
      );
    }

    if (existingDomain) {
      return NextResponse.json(
        { error: "El dominio ya existe en otro vehiculo." },
        { status: 409 },
      );
    }

    const { data: client, error: clientError } = await supabaseServer
      .from("clients")
      .insert({
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone,
        email: payload.email || null,
        address: payload.address || null,
        notes: payload.notes || null,
      })
      .select(
        "id, first_name, last_name, phone, email, address, notes, created_at, updated_at",
      )
      .single();

    if (clientError || !client) {
      console.error("POST /api/clientes client create error:", clientError);
      return NextResponse.json(
        { error: "No se pudo crear el cliente." },
        { status: 500 },
      );
    }

    const { data: createdVehicle, error: vehicleError } = await supabaseServer
      .from("vehicles")
      .insert({
        client_id: client.id,
        brand: vehicle.brand,
        model: vehicle.model,
        domain,
        year: vehicle.year ?? null,
        color: vehicle.color || null,
        notes: vehicle.notes || null,
      })
      .select(
        "id, client_id, brand, model, year, domain, color, notes, created_at, updated_at",
      )
      .single();

    if (vehicleError) {
      console.error("POST /api/clientes vehicle create error:", vehicleError);
      return NextResponse.json(
        { error: "Cliente creado, pero no se pudo crear el vehiculo." },
        { status: 500 },
      );
    }

    const vehicles: any[] = createdVehicle ? [createdVehicle] : [];

    let { error: procedureError } = await supabaseServer
      .from("client_procedures")
      .insert({
        client_id: client.id,
        procedure_type_id: payload.procedureTypeId,
        distributor_id: payload.distributorId || null,
        notes: payload.procedureNotes || null,
        paid: payload.paid,
        amount_paid: payload.amountPaid,
      });

    // Compatibilidad temporal: si la BD todavia no tiene paid/amount_paid
    // (PGRST204 en schema cache), insertamos sin esas columnas.
    const missingColumns =
      procedureError?.code === "PGRST204" ||
      procedureError?.code === "42703" ||
      /amount_paid|paid/i.test(procedureError?.message || "");

    if (procedureError && missingColumns) {
      console.warn(
        "POST /api/clientes procedure create warning: fallback without paid/amount_paid",
        procedureError,
      );

      const fallback = await supabaseServer.from("client_procedures").insert({
        client_id: client.id,
        procedure_type_id: payload.procedureTypeId,
        distributor_id: payload.distributorId || null,
        notes: payload.procedureNotes || null,
      });
      procedureError = fallback.error;
    }

    if (procedureError) {
      console.error("POST /api/clientes procedure create error:", procedureError);
      return NextResponse.json(
        {
          error: "Cliente creado, pero no se pudo registrar el tramite inicial.",
          details: procedureError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        data: mapClient({
          ...client,
          client_procedures: [],
          vehicles,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/clientes error:", error);
    return NextResponse.json(
      { error: "No se pudo crear el cliente." },
      { status: 500 },
    );
  }
}
