import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const AUTH_COOKIE_NAME = "sgitm_session";
const SESSION_TTL_DAYS = 14;

export type AppRole = "OFICINA" | "MESA_ENTRADA";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: AppRole;
};

export async function createSession(userId: string) {
  const supabase = getSupabaseServerClient();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const { error } = await supabase.from("app_sessions").insert({
    token,
    user_id: userId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw new Error("No se pudo crear la sesion.");

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession(token?: string | null) {
  const cookieStore = await cookies();
  const currentToken = token ?? cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;

  if (currentToken) {
    const supabase = getSupabaseServerClient();
    await supabase.from("app_sessions").delete().eq("token", currentToken);
  }

  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("app_sessions")
    .select("token, expires_at, app_users(id, username, full_name, role, active)")
    .eq("token", token)
    .gte("expires_at", nowIso)
    .maybeSingle();

  if (error || !data || !data.app_users || (data.app_users as any).active !== true) {
    return null;
  }

  const user = data.app_users as any;
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
  };
}
