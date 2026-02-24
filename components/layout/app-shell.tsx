"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AppRole, getModulesByRole } from "@/lib/modules";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  sectionLabel: string;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
};

export function AppShell({
  sectionLabel,
  title,
  subtitle,
  headerActions,
  hideHeader = false,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [pendingOfficeCount, setPendingOfficeCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json();
        if (!mounted || !res.ok || !json.data) return;
        setRole(json.data.role as AppRole);
        setFullName(json.data.fullName ?? "");
      } catch {
        // No-op: middleware ya protege navegacion.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (role !== "OFICINA") {
      setPendingOfficeCount(0);
      return;
    }

    let mounted = true;
    async function fetchPendingCount() {
      try {
        const res = await fetch("/api/tramites/oficina/pending-count", { cache: "no-store" });
        const json = await res.json();
        if (!mounted || !res.ok) return;
        setPendingOfficeCount(Number(json?.data?.pending ?? 0));
      } catch {
        if (!mounted) return;
      }
    }

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [role]);

  const modules = useMemo(() => getModulesByRole(role), [role]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] grid-cols-1 gap-5 p-4 lg:h-full lg:min-h-0 lg:grid-cols-[250px_1fr] lg:p-4">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full lg:overflow-hidden lg:p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Taller GNC
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Sistema de Gestion
            </h1>
            <p className="mt-2 text-sm text-slate-600">Accesos del sistema.</p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Usuario
              </p>
              <p className="truncate text-xs font-medium text-slate-800">
                {fullName || "..."}
              </p>
              <p className="text-[11px] text-slate-600">{role || "-"}</p>
              <Button
                variant="outline"
                className="mt-2 h-7 w-full text-xs"
                onClick={handleLogout}
              >
                Cerrar sesion
              </Button>
            </div>
          </div>

          <nav className="space-y-2 lg:max-h-[calc(100dvh-235px)] lg:overflow-auto">
            {modules.map((module) => {
              const isActive =
                pathname === module.href || pathname.startsWith(`${module.href}/`);

              return (
                <Link
                  key={module.key}
                  href={module.href}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <module.icon className="h-4 w-4" />
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {module.title}
                      {module.key === "tramites" && role === "OFICINA" && pendingOfficeCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full border border-red-200 bg-red-100 px-1.5 py-[1px] text-[10px] font-semibold leading-3 text-red-700">
                          {pendingOfficeCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-70" />
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0">
          {!hideHeader ? (
            <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {sectionLabel}
                  </p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                    {title}
                  </h2>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                  ) : null}
                </div>
                {headerActions ? <div>{headerActions}</div> : null}
              </div>
            </header>
          ) : null}

          <div
            className={`space-y-4 lg:flex-1 lg:overflow-auto ${
              hideHeader ? "lg:py-0" : "lg:py-3"
            }`}
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
