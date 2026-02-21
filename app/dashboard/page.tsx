import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <AppShell
      sectionLabel="Modulo"
      title="Dashboard"
      subtitle="Vista principal del taller con indicadores, actividad y alertas."
    >
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            Vista principal del taller con indicadores, actividad y alertas.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
