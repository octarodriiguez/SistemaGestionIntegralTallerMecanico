"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";
import { OfficePendingCard } from "@/components/modules/tramites/office-pending-card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function TramitesPage() {
  const [openCreateModal, setOpenCreateModal] = useState(false);

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
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl text-slate-900">
                Alta principal de tramite
              </CardTitle>
              <Button
                onClick={() => setOpenCreateModal(true)}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo tramite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Usa el boton <span className="font-semibold">Nuevo tramite</span> para abrir el formulario.
            </p>
          </CardContent>
        </Card>

        <OfficePendingCard />
      </div>

      {openCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-4">
          <div className="h-[92vh] w-[96vw] rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Alta de tramite
                </h3>
                <p className="text-sm text-slate-600">
                  Carga de cliente, vehiculo y tramite inicial.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpenCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[calc(92vh-78px)] overflow-auto p-4">
              <NewClientWithVehicleForm onSuccess={() => setOpenCreateModal(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
