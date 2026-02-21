import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const [{ data: procedureTypes, error: procedureTypesError }, { data: distributors, error: distributorsError }] =
      await Promise.all([
        supabase
          .from("procedure_types")
          .select("id, code, display_name, requires_distributor")
          .order("display_name", { ascending: true }),
        supabase.from("distributors").select("id, name").order("name", { ascending: true }),
      ]);

    if (procedureTypesError || distributorsError) {
      console.error("GET /api/catalogos error:", procedureTypesError ?? distributorsError);
      return NextResponse.json(
        { error: "No se pudieron obtener los catalogos." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        procedureTypes: procedureTypes ?? [],
        distributors: distributors ?? [],
      },
    });
  } catch (error) {
    console.error("GET /api/catalogos error:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los catalogos." },
      { status: 500 },
    );
  }
}
