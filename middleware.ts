import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "sgitm_session";

type AppRole = "OFICINA" | "MESA_ENTRADA";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/icons")) return true;
  if (pathname === "/manifest.json") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  return false;
}

function isRoleAllowed(pathname: string, role: AppRole) {
  const officeOnlyPrefixes = ["/avisos", "/alertas", "/distribuidoras", "/comprobantes"];
  const officeOnlyApiPrefixes = ["/api/avisos", "/api/alertas"];

  if (pathname.startsWith("/api/tramites/oficina")) return role === "OFICINA";
  if (officeOnlyPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return role === "OFICINA";
  }
  if (officeOnlyApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === "OFICINA";
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Configuracion incompleta de autenticacion." }, { status: 500 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const nowIso = new Date().toISOString();
  const sessionQuery = `${supabaseUrl}/rest/v1/app_sessions?select=token,expires_at,app_users(role,active)&token=eq.${encodeURIComponent(token)}&expires_at=gte.${encodeURIComponent(nowIso)}&limit=1`;
  const response = await fetch(sessionQuery, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No se pudo validar sesion." }, { status: 500 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const rows = (await response.json()) as any[];
  const role = rows?.[0]?.app_users?.role as AppRole | undefined;
  const active = rows?.[0]?.app_users?.active === true;

  if (!role || !active) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesion invalida." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!isRoleAllowed(pathname, role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
    }
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
