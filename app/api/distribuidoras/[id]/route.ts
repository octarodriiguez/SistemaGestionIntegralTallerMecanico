import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const { params } = context ?? {};
    const { data, error } = await supabase
      .from("distributors")
      .select("id, name, phone, created_at")
      .eq("id", params?.id)
      .single();

    if (error) {
      console.error("GET /api/distribuidoras/[id] error:", error);
      return NextResponse.json(
        { error: "No se pudo cargar la distribuidora." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/distribuidoras/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la distribuidora." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { params } = context ?? {};

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const payload = {
      name: name.toUpperCase(),
      phone: body.phone ? String(body.phone).trim() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("distributors")
      .update(payload)
      .eq("id", params?.id);

    if (error) {
      console.error("PATCH /api/distribuidoras/[id] error:", error);
      return NextResponse.json(
        { error: "No se pudo actualizar la distribuidora." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { id: params?.id } });
  } catch (error) {
    console.error("PATCH /api/distribuidoras/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la distribuidora." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const { params } = context ?? {};

    const { count, error: countError } = await supabase
      .from("distributor_transactions")
      .select("id", { count: "exact", head: true })
      .eq("distributor_id", params?.id);

    if (countError) {
      console.error("DELETE /api/distribuidoras/[id] count error:", countError);
      return NextResponse.json(
        { error: "No se pudo validar transacciones." },
        { status: 500 },
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene transacciones." },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("distributors").delete().eq("id", params?.id);

    if (error) {
      console.error("DELETE /api/distribuidoras/[id] error:", error);
      return NextResponse.json(
        { error: "No se pudo eliminar la distribuidora." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { id: params?.id } });
  } catch (error) {
    console.error("DELETE /api/distribuidoras/[id] error:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la distribuidora." },
      { status: 500 },
    );
  }
}
