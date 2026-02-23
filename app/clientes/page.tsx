"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import toast from "react-hot-toast";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";

type ProcedureRow = {
  id: string;
  createdAt: string;
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
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function todayString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toWhatsappPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("0")) return `549${digits.slice(1)}`;
  return `549${digits}`;
}

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

export default function ClientesPage() {
  const [rows, setRows] = useState<ProcedureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dateFilter, setDateFilter] = useState(todayString());
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const activeDate = useMemo(() => (showAll ? "" : dateFilter), [showAll, dateFilter]);

  async function fetchProcedures({
    query = search,
    page = pagination.page,
    date = activeDate,
    all = showAll,
  }: {
    query?: string;
    page?: number;
    date?: string;
    all?: boolean;
  } = {}) {
    setLoading(true);
    try {
      const searchMode = query.trim().length > 0;
      const effectiveAll = all || searchMode;
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (effectiveAll) {
        params.set("all", "1");
      } else if (date) {
        params.set("date", date);
      }

      const res = await fetch(`/api/tramites?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar tramites.");

      setRows(json.data ?? []);
      setPagination(
        json.pagination ?? {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al cargar tramites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProcedures({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, dateFilter]);

  function handleSearch() {
    fetchProcedures({ page: 1, query: search });
  }

  async function handleCreateSuccess() {
    setOpenCreateModal(false);
    await fetchProcedures({ page: 1 });
  }

  return (
    <AppShell hideHeader sectionLabel="Modulo" title="Clientes" subtitle="">
      <div className="mx-auto w-full max-w-[1320px]">
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-2xl text-slate-900">
              Tramites de clientes
            </CardTitle>
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(260px,380px)_170px_140px_120px] md:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Buscar persona o dominio"
              />
            </div>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setShowAll(false);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />

            <Button
              variant={showAll ? "default" : "outline"}
              onClick={() => setShowAll((prev) => !prev)}
              className={
                showAll
                  ? "rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  : "rounded-xl"
              }
            >
              {showAll ? "Viendo todos" : "Ver todos"}
            </Button>

            <Button
              onClick={handleSearch}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              Buscar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Apellido</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Telefono</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Modelo</th>
                  <th className="px-4 py-3 font-medium">Dominio</th>
                  <th className="px-4 py-3 font-medium">Tramite</th>
                  <th className="px-4 py-3 font-medium">Fecha tramite</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Cargando tramites...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No hay tramites para esta Fecha.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">
                        {row.client?.firstName || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {row.client?.lastName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.client?.phone || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.vehicle?.brand || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.vehicle?.model || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.vehicle?.domain || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.procedureType?.displayName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>
                            {formatDate(row.createdAt)}
                          </span>
                          {row.client?.phone ? (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700 transition hover:bg-emerald-100"
                              title="Contactar por WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Mostrando pagina {pagination.page} de {pagination.totalPages} ({pagination.total} tramites)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchProcedures({ page: pagination.page - 1, query: search })}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchProcedures({ page: pagination.page + 1, query: search })}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {openCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Alta de cliente y vehiculo
                </h3>
                <p className="text-sm text-slate-600">
                  Carga rapida desde modulo clientes.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpenCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <NewClientWithVehicleForm compact onSuccess={handleCreateSuccess} />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
