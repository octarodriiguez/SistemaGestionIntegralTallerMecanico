import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET: fetch pending procedures (PENDIENTE_RECEPCION) grouped by type
export async function GET(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const { params } = context ?? {};
    const { searchParams } = new URL(request.url);
    const typeCode = (searchParams.get("type") ?? "").trim().toUpperCase();

    // Get procedure type IDs for OBLEA and PH
    const { data: procedureTypes } = await supabase
      .from("procedure_types")
      .select("id, code, display_name")
      .in("code", ["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"]);

    const typeMap = new Map((procedureTypes ?? []).map((t: any) => [t.code, t]));

    let targetTypeIds: string[] = [];
    if (typeCode === "OBLEA") {
      const t = typeMap.get("RENOVACION_OBLEA") as any;
      if (t) targetTypeIds = [t.id];
    } else if (typeCode === "PH") {
      const t = typeMap.get("PRUEBA_HIDRAULICA") as any;
      if (t) targetTypeIds = [t.id];
    } else {
      targetTypeIds = (procedureTypes ?? []).map((t: any) => t.id);
    }

    if (targetTypeIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get procedures linked to this distributor that are PENDIENTE_RECEPCION
    // First get all pending delivery status IDs
    const { data: pendingStatuses } = await supabase
      .from("procedure_delivery_status")
      .select("procedure_id")
      .eq("status", "PENDIENTE_RECEPCION");

    const pendingIds = (pendingStatuses ?? []).map((r: any) => r.procedure_id);

    // Also include procedures with no delivery status row (they default to PENDIENTE_RECEPCION)
    let query = supabase
      .from("client_procedures")
      .select(
        "id, created_at, notes, clients(id, first_name, last_name), procedure_types(id, code, display_name), vehicles:vehicles(brand, model, domain)",
      )
      .eq("distributor_id", params?.id)
      .in("procedure_type_id", targetTypeIds)
      .order("created_at", { ascending: false });

    const { data: procedures } = await query;

    // Filter: keep only those that are PENDIENTE_RECEPCION (in pendingIds OR have no status row)
    const { data: allStatuses } = await supabase
      .from("procedure_delivery_status")
      .select("procedure_id, status")
      .in("procedure_id", (procedures ?? []).map((p: any) => p.id));

    const statusByProcedure = new Map(
      (allStatuses ?? []).map((s: any) => [s.procedure_id, s.status]),
    );

    const pending = (procedures ?? []).filter((p: any) => {
      const status = statusByProcedure.get(p.id);
      return !status || status === "PENDIENTE_RECEPCION";
    });

    const mapped = pending.map((p: any) => {
      const clientVehicles = Array.isArray(p.vehicles) ? p.vehicles : p.vehicles ? [p.vehicles] : [];
      return {
        id: p.id,
        createdAt: p.created_at,
        client: p.clients
          ? { firstName: p.clients.first_name, lastName: p.clients.last_name }
          : null,
        procedureType: p.procedure_types
          ? { code: p.procedure_types.code, displayName: p.procedure_types.display_name }
          : null,
        vehicle: clientVehicles[0] ?? null,
      };
    });

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("GET /api/distribuidoras/[id]/recepcion error:", error);
    return NextResponse.json({ error: "No se pudieron cargar tramites pendientes." }, { status: 500 });
  }
}

// POST: register reception — mark procedures as RECIBIDO + create grouped transactions
export async function POST(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const { params } = context ?? {};
    const body = await request.json();

    // lines: [{ type: "OBLEA"|"PH", quantity: number, unitPrice: number, procedureIds: string[] }]
    const lines: { type: string; quantity: number; unitPrice: number; procedureIds: string[] }[] =
      body.lines ?? [];
    const transactionDate: string = body.transactionDate ?? new Date().toLocaleDateString("en-CA");

    if (!lines.length) {
      return NextResponse.json({ error: "Sin lineas de recepcion." }, { status: 400 });
    }

    const allProcedureIds = lines.flatMap((l) => l.procedureIds);
    if (allProcedureIds.length === 0) {
      return NextResponse.json({ error: "No se seleccionaron tramites." }, { status: 400 });
    }

    const receivedAt = new Date().toISOString();

    // 1. Upsert delivery status to RECIBIDO for all selected procedures
    const statusRows = allProcedureIds.map((id) => ({
      procedure_id: id,
      status: "RECIBIDO",
      received_at: receivedAt,
    }));

    const { error: statusError } = await supabase
      .from("procedure_delivery_status")
      .upsert(statusRows, { onConflict: "procedure_id" });

    if (statusError) {
      console.error("recepcion upsert status error:", statusError);
      return NextResponse.json({ error: "No se pudo actualizar estado de tramites." }, { status: 500 });
    }

    // 2. Create one PURCHASE transaction per line (grouped by type)
    const typeLabels: Record<string, string> = {
      OBLEA: "OBLEAS",
      PH: "PRUEBA HIDRAULICA",
    };

    for (const line of lines) {
      if (!line.procedureIds.length) continue;
      const amount = Number((line.quantity * line.unitPrice).toFixed(2));
      const description = `RECEPCION ${typeLabels[line.type] ?? line.type} x${line.quantity}`;

      const { error: txError } = await supabase.from("distributor_transactions").insert({
        distributor_id: params?.id,
        type: "PURCHASE",
        description,
        amount,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        transaction_date: transactionDate,
        notes: `Tramites: ${line.procedureIds.join(", ")}`,
      });

      if (txError) {
        console.error("recepcion insert transaction error:", txError);
        return NextResponse.json({ error: "No se pudo registrar la transaccion." }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { ok: true, proceduresUpdated: allProcedureIds.length } });
  } catch (error) {
    console.error("POST /api/distribuidoras/[id]/recepcion error:", error);
    return NextResponse.json({ error: "No se pudo registrar la recepcion." }, { status: 500 });
  }
}
