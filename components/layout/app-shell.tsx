"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { appModules } from "@/lib/modules";

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

  return (
    <main className="min-h-screen bg-slate-50 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-[1350px] grid-cols-1 gap-4 p-3 lg:h-full lg:min-h-0 lg:grid-cols-[210px_1fr] lg:p-1">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full lg:overflow-hidden lg:p-4">
          <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Taller GNC
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Sistema de Gestion
            </h1>
            <p className="mt-2 text-sm text-slate-600">Accesos del sistema.</p>
          </div>

          <nav className="space-y-2 lg:max-h-[calc(100dvh-220px)] lg:overflow-auto">
            {appModules.map((module) => {
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
                    <span className="text-sm font-medium">{module.title}</span>
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
