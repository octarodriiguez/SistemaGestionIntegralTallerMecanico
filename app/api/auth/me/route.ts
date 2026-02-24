import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth-session";

export async function GET() {
  try {
    const user = await getCurrentSessionUser();
    if (!user) return NextResponse.json({ data: null }, { status: 401 });
    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "No se pudo obtener sesion." }, { status: 500 });
  }
}
