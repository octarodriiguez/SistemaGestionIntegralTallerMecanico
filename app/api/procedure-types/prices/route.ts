import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  prices: z.array(
    z.object({
      code: z.enum(["RENOVACION_OBLEA", "PRUEBA_HIDRAULICA"]),
      price: z.number().min(0),
    }),
  ).min(1),
});

export async function PATCH(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
    }

    const updates = parsed.data.prices.map((item) => ({
      code: item.code,
      current_price: item.price,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("procedure_types")
      .upsert(updates, { onConflict: "code" });

    if (error) {
      console.error("PATCH /api/procedure-types/prices error:", error);
      return NextResponse.json(
        { error: "No se pudieron actualizar los precios." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { updated: updates.length } });
  } catch (error) {
    console.error("PATCH /api/procedure-types/prices error:", error);
    return NextResponse.json(
      { error: "No se pudieron actualizar los precios." },
      { status: 500 },
    );
  }
}

