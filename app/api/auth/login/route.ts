import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createSession } from "@/lib/auth-session";

const loginSchema = z.object({
  username: z.string().trim().min(3, "Usuario invalido."),
  password: z.string().min(1, "Password obligatorio."),
});

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
        { status: 400 },
      );
    }

    const username = parsed.data.username.toLowerCase();
    const password = parsed.data.password;

    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, username, full_name, role, active, password_hash")
      .eq("username", username)
      .maybeSingle();

    if (error || !user || !user.active) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesion." }, { status: 500 });
  }
}
