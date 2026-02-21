import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AlertasPage() {
  return (
    <AppShell
      sectionLabel="Modulo"
      title="Alertas"
      subtitle="Control de vencimientos y preparacion de notificaciones a clientes."
    >
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            Control de vencimientos y preparacion de notificaciones a clientes.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
