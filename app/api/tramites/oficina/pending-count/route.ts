import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
      .from("procedure_office_status")
      .select("procedure_id", { count: "exact", head: true })
      .eq("status", "PENDIENTE_CARGA");

    if (error) {
      console.error("GET /api/tramites/oficina/pending-count error:", error);
      return NextResponse.json(
        { error: "No se pudo obtener cantidad pendiente." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { pending: count ?? 0 } });
  } catch (error) {
    console.error("GET /api/tramites/oficina/pending-count error:", error);
    return NextResponse.json(
      { error: "No se pudo obtener cantidad pendiente." },
      { status: 500 },
    );
  }
}
