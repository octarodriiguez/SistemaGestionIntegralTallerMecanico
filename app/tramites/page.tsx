"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";
import { OfficePendingCard } from "@/components/modules/tramites/office-pending-card";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

type QuickRow = {
  id: string;
  createdAt: string;
  client: { firstName: string; lastName: string } | null;
  vehicle: { domain: string } | null;
  procedureType: { displayName: string; code?: string } | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const datePart = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-AR");
}

function procedureLabel(code: string | undefined, displayName: string | undefined) {
  if (code === "RENOVACION_OBLEA") return "OBLEA";
  if (code === "PRUEBA_HIDRAULICA") return "PH";
  return displayName || "-";
}

export default function TramitesPage() {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [rows, setRows] = useState<QuickRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  async function fetchLatestRows() {
    setLoadingRows(true);
    try {
      const res = await fetch("/api/tramites?all=1&page=1&pageSize=12", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar trámites.");
      setRows(json.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    fetchLatestRows();
  }, []);

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
              <NewClientWithVehicleForm
                onSuccess={async () => {
                  setOpenCreateModal(false);
                  await fetchLatestRows();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Card className="rounded-2xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl text-slate-900">Últimos trámites cargados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="w-[35%] px-3 py-2.5 font-medium">Cliente</th>
                  <th className="w-[15%] px-3 py-2.5 font-medium">Dominio</th>
                  <th className="w-[30%] px-3 py-2.5 font-medium">Trámite</th>
                  <th className="w-[20%] px-3 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Cargando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Sin datos.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 text-slate-700">
                        {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                      </td>
                      <td className="px-3 py-2.5 font-semibold tracking-wide text-slate-700">
                        {row.vehicle?.domain || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
