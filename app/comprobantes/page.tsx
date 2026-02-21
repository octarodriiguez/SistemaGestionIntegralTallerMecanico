import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComprobantesPage() {
  return (
    <AppShell
      sectionLabel="Modulo"
      title="Comprobantes"
      subtitle="Emision y consulta de recibos, presupuestos y garantias."
    >
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">
              Comprobantes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            Emision y consulta de recibos, presupuestos y garantias.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
