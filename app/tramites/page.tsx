import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";

export default function TramitesPage() {
  return (
    <AppShell
      sectionLabel="Modulo"
      title="Tramites"
      subtitle="Alta de cliente con tramite inicial y vehiculo obligatorio."
      hideHeader
    >
      <div className="grid gap-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">
              Alta principal de tramite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NewClientWithVehicleForm />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
