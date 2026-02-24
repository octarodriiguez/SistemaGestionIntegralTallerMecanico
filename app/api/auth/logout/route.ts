import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth-session";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ error: "No se pudo cerrar sesion." }, { status: 500 });
  }
}
