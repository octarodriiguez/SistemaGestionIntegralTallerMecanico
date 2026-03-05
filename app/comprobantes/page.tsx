"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DeliveryRow = {
  id: string;
  createdAt: string;
  status: "PENDIENTE_RECEPCION" | "RECIBIDO" | "AVISADO_RETIRO" | "RETIRADO" | string;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  vehicle: {
    brand: string;
    model: string;
    domain: string;
  } | null;
  procedureType: {
    displayName: string;
    code: string;
  } | null;
};

function procedureLabel(code: string | undefined, displayName: string | undefined) {
  if (code === "RENOVACION_OBLEA") return "OBLEA";
  if (code === "PRUEBA_HIDRAULICA") return "PH";
  return displayName || "-";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const datePart = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }
  return new Date(value).toLocaleDateString("es-AR");
}

export default function ComprobantesPage() {
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RETIRADO" | "PENDIENTE">("ALL");

  async function fetchRows(searchValue = query) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("filter", "all");
      params.set("page", "1");
      params.set("pageSize", "200");
      if (searchValue.trim()) params.set("q", searchValue.trim());

      const res = await fetch(`/api/avisos/retiro?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron obtener comprobantes.");
      setRows(json.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    if (statusFilter === "RETIRADO") return rows.filter((row) => row.status === "RETIRADO");
    return rows.filter((row) => row.status !== "RETIRADO");
  }, [rows, statusFilter]);

  const retiredCount = useMemo(
    () => rows.filter((row) => row.status === "RETIRADO").length,
    [rows],
  );
  const pendingCount = useMemo(
    () => rows.filter((row) => row.status !== "RETIRADO").length,
    [rows],
  );

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Comprobantes"
      subtitle="Seguimiento de tramites retirados y pendientes para emision/entrega."
    >
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl text-slate-900">Estado de tramites</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
                Retirados: {retiredCount}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 font-semibold text-amber-700">
                Pendientes: {pendingCount}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_180px_120px]">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="Buscar persona o dominio"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "ALL" | "RETIRADO" | "PENDIENTE")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="ALL">Todos</option>
                <option value="RETIRADO">Retirados</option>
                <option value="PENDIENTE">Pendientes</option>
              </select>
              <Button onClick={() => fetchRows(query)} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                Buscar
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200">
              <table className="w-full table-auto text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Cliente</th>
                    <th className="px-3 py-2.5 font-medium">Dominio</th>
                    <th className="px-3 py-2.5 font-medium">Vehiculo</th>
                    <th className="px-3 py-2.5 font-medium">Tramite</th>
                    <th className="px-3 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Cargando comprobantes...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No hay tramites para mostrar.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 text-slate-800">
                          <div className="font-medium">
                            {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                          </div>
                          <div className="text-[11px] text-slate-600">{row.client?.phone || "-"}</div>
                        </td>
                        <td className="px-3 py-2.5 font-semibold tracking-wide text-slate-700 whitespace-nowrap">
                          {row.vehicle?.domain || "-"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{formatDate(row.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              row.status === "RETIRADO"
                                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                : "border-amber-200 bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.status === "RETIRADO" ? "RETIRADO" : "PENDIENTE"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

