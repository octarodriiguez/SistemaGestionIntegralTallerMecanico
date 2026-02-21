import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DistribuidorasPage() {
  return (
    <AppShell
      sectionLabel="Modulo"
      title="Distribuidoras"
      subtitle="Administracion de compras, pagos y cuenta corriente por proveedor."
    >
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">
              Distribuidoras
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-600">
            Administracion de compras, pagos y cuenta corriente por proveedor.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
