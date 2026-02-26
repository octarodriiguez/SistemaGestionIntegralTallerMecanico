"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, Pencil, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import toast from "react-hot-toast";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";

type ProcedureRow = {
  id: string;
  createdAt: string;
  notes: string | null;
  paid: boolean | null;
  totalAmount: number | null;
  amountPaid: number | null;
  client: {
    id: string;
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
    code?: string;
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

function formatAmount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function ClientesPage() {
  const [rows, setRows] = useState<ProcedureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    clientId: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    notes: "",
  });
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

  function openEditClient(row: ProcedureRow) {
    if (!row.client?.id) return;
    setEditForm({
      clientId: row.client.id,
      firstName: row.client.firstName ?? "",
      lastName: row.client.lastName ?? "",
      phone: row.client.phone ?? "",
      address: "",
      notes: "",
    });
    setOpenEditModal(true);
  }

  async function handleSaveClientEdit() {
    if (!editForm.clientId) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "No se pudo actualizar el cliente.");
      }

      toast.success("Cliente actualizado.");
      setOpenEditModal(false);
      await fetchProcedures({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar cliente.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleEditPayment(row: ProcedureRow) {
    const currentTotal = Number(row.totalAmount ?? 0);
    const currentPaid = Number(row.amountPaid ?? 0);

    const totalInput = window.prompt("Total a pagar:", String(currentTotal));
    if (totalInput === null) return;
    const paidInput = window.prompt("Monto abonado:", String(currentPaid));
    if (paidInput === null) return;

    const totalAmount = Number(totalInput.replace(",", "."));
    const amountPaid = Number(paidInput.replace(",", "."));

    if (Number.isNaN(totalAmount) || totalAmount < 0 || Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error("Montos invalidos.");
      return;
    }

    try {
      const res = await fetch("/api/tramites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id, totalAmount, amountPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar pago.");

      toast.success("Pago actualizado.");
      await fetchProcedures({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar pago.");
    }
  }

  async function handleDeleteProcedure(procedureId: string) {
    const confirmed = window.confirm("¿Eliminar este trámite? Esta accion no se puede deshacer.");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/tramites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo eliminar.");

      toast.success("Trámite eliminado.");
      await fetchProcedures({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar.");
    }
  }

  async function handleMarkRetired(row: ProcedureRow) {
    const remaining = Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0);
    const input = window.prompt(
      `Monto abonado al retirar (saldo actual: ${remaining}):`,
      remaining > 0 ? String(remaining) : "0",
    );
    if (input === null) return;
    const amountPaid = Number(input.replace(",", "."));
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error("Monto inválido.");
      return;
    }

    try {
      const res = await fetch("/api/avisos/retiro/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id, action: "retired", amountPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo marcar retirado.");

      toast.success("Trámite marcado como retirado.");
      await fetchProcedures({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al marcar retirado.");
    }
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
          <div className="rounded-xl border border-slate-200">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="w-[20%] px-3 py-2.5 font-medium">Cliente</th>
                  <th className="w-[15%] px-3 py-2.5 font-medium">Vehiculo</th>
                  <th className="w-[10%] px-3 py-2.5 font-medium">Tramite</th>
                  <th className="w-[8%] px-3 py-2.5 font-medium">Total</th>
                  <th className="w-[8%] px-3 py-2.5 font-medium">Abonado</th>
                  <th className="w-[8%] px-3 py-2.5 font-medium">Saldo</th>
                  <th className="w-[7%] px-3 py-2.5 font-medium">Pagado</th>
                  <th className="w-[12%] px-3 py-2.5 font-medium">Obs</th>
                  <th className="w-[12%] px-3 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Cargando tramites...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No hay tramites para esta Fecha.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="truncate font-medium text-slate-800">
                          {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] text-slate-600">
                            {row.client?.phone || "-"}
                          </span>
                          {row.client?.id ? (
                            <button
                              type="button"
                              onClick={() => openEditClient(row)}
                              className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-1.5 py-1 text-slate-700 transition hover:bg-slate-100"
                              title="Editar cliente"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="truncate">
                          {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                        </div>
                        <div className="truncate font-semibold tracking-wide text-slate-800">
                          {row.vehicle?.domain || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {row.procedureType?.displayName || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {formatAmount(row.totalAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {formatAmount(row.amountPaid)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">
                        {formatAmount(
                          Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0),
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full border px-1.5 py-[1px] text-[10px] font-semibold leading-3 ${
                            row.paid
                              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                              : "border-amber-200 bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.paid ? "SI" : "NO"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="truncate" title={row.notes || "-"}>
                          {row.notes || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>
                            {formatDate(row.createdAt)}
                          </span>
                          {row.client?.phone ? (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-emerald-700 transition hover:bg-emerald-100"
                              title="Contactar por WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleEditPayment(row)}
                            className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-50 px-1.5 py-1 text-sky-700 transition hover:bg-sky-100"
                            title="Editar pago"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProcedure(row.id)}
                            className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-50 px-1.5 py-1 text-rose-700 transition hover:bg-rose-100"
                            title="Eliminar trámite"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkRetired(row)}
                            className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-emerald-700 transition hover:bg-emerald-100"
                            title="Marcar retirado"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-4">
          <div className="h-[92vh] w-[96vw] rounded-2xl border border-slate-200 bg-white shadow-2xl">
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
            <div className="h-[calc(92vh-78px)] overflow-auto p-4">
              <NewClientWithVehicleForm onSuccess={handleCreateSuccess} />
            </div>
          </div>
        </div>
      ) : null}

      {openEditModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Editar cliente</h3>
                <p className="text-sm text-slate-600">Actualiza datos de contacto.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpenEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, firstName: e.target.value.toUpperCase() }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="Nombre"
                />
                <input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, lastName: e.target.value.toUpperCase() }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="Apellido"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="Telefono"
                />
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  placeholder="Direccion (opcional)"
                />
              </div>
              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, notes: e.target.value.toUpperCase() }))
                }
                className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                placeholder="Notas (opcional)"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenEditModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveClientEdit}
                  disabled={savingEdit}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
