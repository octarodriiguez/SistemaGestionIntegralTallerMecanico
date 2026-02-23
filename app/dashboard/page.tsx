import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { appModules } from "@/lib/modules";

export default function DashboardPage() {
  return (
    <AppShell
      sectionLabel="Menu Principal"
      title="Modulos del sistema"
      headerActions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500 sm:w-72">
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar modulo...</span>
          </div>
          <Button
            asChild
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            <Link href="/tramites">Nuevo tramite</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {appModules.map((module) => (
          <Card
            key={module.key}
            className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <CardHeader className="pb-2">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                <module.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">{module.description}</p>
              <Button
                asChild
                variant="outline"
                className="w-full justify-between rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                <Link href={module.href}>
                  Abrir modulo
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
