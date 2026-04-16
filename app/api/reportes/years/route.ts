import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Returns the list of years that have at least one procedure
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("client_procedures")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ years: [] });
    }

    // Get oldest and newest year
    const oldest = data?.[0]?.created_at ? new Date(data[0].created_at).getFullYear() : new Date().getFullYear();
    const newest = new Date().getFullYear();

    const years: number[] = [];
    for (let y = newest; y >= oldest; y--) years.push(y);

    return NextResponse.json({ years });
  } catch {
    return NextResponse.json({ years: [] });
  }
}
