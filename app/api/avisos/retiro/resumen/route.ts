import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const TARGET_CODES = ["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"];

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data: procedureTypes } = await supabase
      .from("procedure_types")
      .select("id")
      .in("code", TARGET_CODES);

    const targetProcedureTypeIds = (procedureTypes ?? []).map((item) => item.id);
    if (targetProcedureTypeIds.length === 0) {
      return NextResponse.json({
        data: { total: 0, retired: 0, pending: 0 },
      });
    }

    const { data: procedures, error: proceduresError } = await supabase
      .from("client_procedures")
      .select("id")
      .in("procedure_type_id", targetProcedureTypeIds)
      .limit(10000);

    if (proceduresError) {
      return NextResponse.json(
        { error: "No se pudieron obtener tramites para resumen de retiro." },
        { status: 500 },
      );
    }

    const procedureIds = (procedures ?? []).map((row) => row.id);
    if (procedureIds.length === 0) {
      return NextResponse.json({
        data: { total: 0, retired: 0, pending: 0 },
      });
    }

    const retiredIds = new Set<string>();
    const chunks = chunkArray(procedureIds, 300);
    for (const chunk of chunks) {
      const { data: statusRows } = await supabase
        .from("procedure_delivery_status")
        .select("procedure_id, status")
        .in("procedure_id", chunk)
        .eq("status", "RETIRADO");

      for (const row of statusRows ?? []) {
        retiredIds.add(row.procedure_id);
      }
    }

    const total = procedureIds.length;
    const retired = retiredIds.size;
    const pending = Math.max(total - retired, 0);

    return NextResponse.json({
      data: { total, retired, pending },
    });
  } catch (error) {
    console.error("GET /api/avisos/retiro/resumen error:", error);
    return NextResponse.json(
      { error: "No se pudo obtener resumen de retiros." },
      { status: 500 },
    );
  }
}

