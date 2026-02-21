import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const createVehicleSchema = z.object({
  clientId: z.string().trim().min(1, "clientId es obligatorio."),
  brand: z.string().trim().min(2, "La marca es obligatoria."),
  model: z.string().trim().min(1, "El modelo es obligatorio."),
  domain: z.string().trim().min(6, "El dominio es obligatorio."),
  year: z.number().int().min(1950).max(2100).optional(),
  color: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function normalizeDomain(domain: string) {
  return domain.toUpperCase().replace(/\s+/g, "");
}

function mapVehicle(row: any) {
  return {
    id: row.id,
    clientId: row.client_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    domain: row.domain,
    color: row.color,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: Request) {
  try {
    const supabaseServer = getSupabaseServerClient();
    const json = await request.json();
    const parsed = createVehicleSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const domain = normalizeDomain(payload.domain);

    const [{ data: client, error: clientError }, { data: existingDomain, error: domainError }] =
      await Promise.all([
        supabaseServer
          .from("clients")
          .select("id")
          .eq("id", payload.clientId)
          .maybeSingle(),
        supabaseServer
          .from("vehicles")
          .select("id")
          .eq("domain", domain)
          .maybeSingle(),
      ]);

    if (clientError) {
      console.error("POST /api/vehiculos client check error:", clientError);
      return NextResponse.json(
        { error: "No se pudo validar el cliente." },
        { status: 500 },
      );
    }

    if (domainError) {
      console.error("POST /api/vehiculos domain check error:", domainError);
      return NextResponse.json(
        { error: "No se pudo validar el dominio." },
        { status: 500 },
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: "El cliente no existe." },
        { status: 404 },
      );
    }

    if (existingDomain) {
      return NextResponse.json(
        { error: "Ya existe un vehiculo con ese dominio." },
        { status: 409 },
      );
    }

    const { data: createdVehicle, error: createError } = await supabaseServer
      .from("vehicles")
      .insert({
        client_id: payload.clientId,
        brand: payload.brand,
        model: payload.model,
        domain,
        year: payload.year ?? null,
        color: payload.color || null,
        notes: payload.notes || null,
      })
      .select("id, client_id, brand, model, year, domain, color, notes, created_at, updated_at")
      .single();

    if (createError || !createdVehicle) {
      console.error("POST /api/vehiculos create error:", createError);
      return NextResponse.json(
        { error: "No se pudo crear el vehiculo." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: mapVehicle(createdVehicle) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vehiculos error:", error);
    return NextResponse.json(
      { error: "No se pudo crear el vehiculo." },
      { status: 500 },
    );
  }
}
