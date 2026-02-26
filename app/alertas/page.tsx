"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  PackageCheck,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AlertRow = {
  id: string;
  createdAt: string;
  notes?: string | null;
  status: "PENDIENTE_DE_AVISAR" | "AVISADO" | "NO_CORRESPONDE_AVISAR" | string;
  enargasLastOperationDate: string | null;
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

type DeliveryRow = {
  id: string;
  createdAt: string;
  notes?: string | null;
  status: "PENDIENTE_RECEPCION" | "RECIBIDO" | "AVISADO_RETIRO" | "RETIRADO" | string;
  paid: boolean | null;
  totalAmount: number | null;
  amountPaid: number | null;
  receivedAt: string | null;
  notifiedAt: string | null;
  pickedUpAt: string | null;
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

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function currentMonthString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function toWhatsappPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("0")) return `549${digits.slice(1)}`;
  return `549${digits}`;
}

function statusLabel(status: string) {
  if (status === "AVISADO") return "AVISADO";
  if (status === "NO_CORRESPONDE_AVISAR") return "NO CORRESPONDE";
  return "PENDIENTE";
}

function statusClass(status: string) {
  if (status === "AVISADO") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "NO_CORRESPONDE_AVISAR") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function deliveryStatusLabel(status: string) {
  if (status === "RECIBIDO") return "RECIBIDO";
  if (status === "AVISADO_RETIRO") return "AVISADO";
  if (status === "RETIRADO") return "RETIRADO";
  return "PENDIENTE";
}

function deliveryStatusClass(status: string) {
  if (status === "RETIRADO") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "AVISADO_RETIRO") return "bg-sky-100 text-sky-700 border-sky-200";
  if (status === "RECIBIDO") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

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

export default function AlertasPage() {
  const [vencimientosOpen, setVencimientosOpen] = useState(false);
  const [retirosOpen, setRetirosOpen] = useState(true);

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [monthFilter, setMonthFilter] = useState(currentMonthString());
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const [deliveryRows, setDeliveryRows] = useState<DeliveryRow[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"yesterday" | "pending" | "all">("yesterday");
  const [deliveryPagination, setDeliveryPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const activeMonth = useMemo(() => (showAll ? "" : monthFilter), [showAll, monthFilter]);

  async function fetchAlerts({
    query = search,
    page = pagination.page,
    month = activeMonth,
    all = showAll,
    status = statusFilter,
  }: {
    query?: string;
    page?: number;
    month?: string;
    all?: boolean;
    status?: string;
  } = {}) {
    setLoading(true);
    try {
      const searchMode = query.trim().length > 0;
      const effectiveAll = all || searchMode;

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status.trim()) params.set("status", status.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (effectiveAll) {
        params.set("all", "1");
      } else if (month) {
        params.set("month", month);
      }

      const res = await fetch(`/api/avisos?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar avisos.");

      setRows(json.data ?? []);
      setPagination(
        json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al cargar avisos.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeliveries({
    query = deliverySearch,
    page = deliveryPagination.page,
    filter = deliveryFilter,
  }: {
    query?: string;
    page?: number;
    filter?: "yesterday" | "pending" | "all";
  } = {}) {
    setDeliveryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("filter", filter);
      params.set("page", String(page));
      params.set("pageSize", String(deliveryPagination.pageSize));

      const res = await fetch(`/api/avisos/retiro?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar retiros.");

      setDeliveryRows(json.data ?? []);
      setDeliveryPagination(
        json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al cargar retiros.");
    } finally {
      setDeliveryLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, monthFilter, statusFilter]);

  useEffect(() => {
    fetchDeliveries({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryFilter]);

  async function runCheck() {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/avisos/comprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: search,
          month: activeMonth,
          all: showAll,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo comprobar.");
      toast.success(
        `Comprobacion terminada. Evaluados: ${json.data?.checked ?? 0} | Pendientes: ${json.data?.pending ?? 0}`,
      );
      await fetchAlerts({ page: 1 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al comprobar.");
    } finally {
      setRunningCheck(false);
    }
  }

  async function handleAvisar(row: AlertRow) {
    if (!row.client?.phone) return;
    try {
      const res = await fetch("/api/avisos/avisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      window.open(
        `https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}`,
        "_blank",
      );
      await fetchAlerts({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al avisar.");
    }
  }

  async function handleDeliveryAction(
    row: DeliveryRow,
    action: "received" | "notified" | "retired",
  ) {
    try {
      let amountPaid: number | undefined;
      if (action === "retired") {
        const remaining = Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0);
        const result = await Swal.fire({
          title: "Marcar retirado",
          text: `Monto abonado al retirar (saldo actual: ${remaining})`,
          input: "text",
          inputValue: remaining > 0 ? String(remaining) : "0",
          showCancelButton: true,
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar",
        });
        if (!result.isConfirmed) return;

        const parsed = Number(String(result.value ?? "").replace(",", "."));
        if (Number.isNaN(parsed) || parsed < 0) {
          await Swal.fire({ title: "Error", text: "Monto invalido.", icon: "error" });
          return;
        }
        amountPaid = parsed;
      }

      const res = await fetch("/api/avisos/retiro/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id, action, amountPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      if (action === "notified" && row.client?.phone) {
        const message =
          row.procedureType?.code === "PRUEBA_HIDRAULICA"
            ? "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra listo el tubo para ser colocado"
            : "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra la OBLEA para ser retirada";
        window.open(
          `https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}&text=${encodeURIComponent(message)}`,
          "_blank",
        );
      }

      await fetchDeliveries({ page: deliveryPagination.page, query: deliverySearch });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar retiro.");
    }
  }

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Avisos"
      subtitle="Control de vencimientos de oblea y prueba hidraulica."
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => setVencimientosOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-left"
                >
                  {vencimientosOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  )}
                  <CardTitle className="text-2xl text-slate-900">Vencimientos</CardTitle>
                </button>
                <Button
                  onClick={runCheck}
                  disabled={runningCheck || !vencimientosOpen}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  <BellRing className="h-4 w-4" />
                  {runningCheck ? "Comprobando..." : "Comprobar vencimientos"}
                </Button>
              </div>
            </CardHeader>

            {vencimientosOpen ? (
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1fr)_160px_180px_140px_120px]">
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
                    type="month"
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value);
                      setShowAll(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE_DE_AVISAR">Pendiente</option>
                    <option value="AVISADO">Avisado</option>
                    <option value="NO_CORRESPONDE_AVISAR">No corresponde</option>
                  </select>

                  <Button
                    variant={showAll ? "default" : "outline"}
                    onClick={() => setShowAll((prev) => !prev)}
                    className={showAll ? "rounded-xl bg-slate-900 text-white hover:bg-slate-800" : "rounded-xl"}
                  >
                    {showAll ? "Viendo todos" : "Ver todos"}
                  </Button>

                  <Button
                    onClick={() => fetchAlerts({ page: 1, query: search })}
                    className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Buscar
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="w-[20%] px-3 py-2.5 font-medium">Cliente</th>
                        <th className="w-[12%] px-3 py-2.5 font-medium">Telefono</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">Dominio</th>
                        <th className="w-[18%] px-3 py-2.5 font-medium">Vehiculo</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Tramite</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">F. tramite</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">F. ENARGAS</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Estado</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                            Cargando avisos...
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                            No hay avisos para este filtro.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="truncate font-medium">
                                {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{row.client?.phone || "-"}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate font-semibold tracking-wide">
                                {row.vehicle?.domain || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{formatDate(row.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{formatDate(row.enargasLastOperationDate)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${statusClass(row.status)}`}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAvisar(row)}
                                  disabled={!row.client?.phone || row.status !== "PENDIENTE_DE_AVISAR"}
                                  className="h-7 gap-1 px-1.5 text-[10px]"
                                >
                                  {row.status === "AVISADO" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  )}
                                  Avisar
                                </Button>
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
                    Mostrando pagina {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() => fetchAlerts({ page: pagination.page - 1, query: search })}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages || loading}
                      onClick={() => fetchAlerts({ page: pagination.page + 1, query: search })}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => setRetirosOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-left"
                >
                  {retirosOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  )}
                  <CardTitle className="text-2xl text-slate-900">Retiro de trámites</CardTitle>
                </button>
              </div>
            </CardHeader>

            {retirosOpen ? (
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_120px]">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
                    <Search className="h-4 w-4" />
                    <input
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      placeholder="Buscar persona o dominio"
                    />
                  </div>
                  <Button
                    onClick={() => fetchDeliveries({ page: 1, query: deliverySearch, filter: deliveryFilter })}
                    className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Buscar
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-[220px]">
                  <select
                    value={deliveryFilter}
                    onChange={(e) => setDeliveryFilter(e.target.value as "yesterday" | "pending" | "all")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="yesterday">Cargados ayer</option>
                    <option value="pending">Todos los pendientes</option>
                    <option value="all">Todos</option>
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="w-[16%] px-3 py-2.5 font-medium">Cliente</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">Telefono</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Dominio</th>
                        <th className="w-[14%] px-3 py-2.5 font-medium">Vehiculo</th>
                        <th className="w-[5%] px-3 py-2.5 font-medium">Tramite</th>
                        <th className="w-[7%] px-3 py-2.5 font-medium">F. alta</th>
                        <th className="w-[7%] px-3 py-2.5 font-medium">Total</th>
                        <th className="w-[7%] px-3 py-2.5 font-medium">Abonado</th>
                        <th className="w-[7%] px-3 py-2.5 font-medium">Saldo</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Pagado</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Estado</th>
                        <th className="w-[13%] px-3 py-2.5 font-medium">Obs</th>
                        <th className="w-[14%] px-3 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryLoading ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                            Cargando retiros...
                          </td>
                        </tr>
                      ) : deliveryRows.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-slate-500">
                            No hay trámites para retiro.
                          </td>
                        </tr>
                      ) : (
                        deliveryRows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="truncate font-medium">
                                {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{row.client?.phone || "-"}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate font-semibold tracking-wide">
                                {row.vehicle?.domain || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{formatDate(row.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{formatAmount(row.totalAmount)}</td>
                            <td className="px-3 py-2.5 text-slate-700">{formatAmount(row.amountPaid)}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-700">
                              {formatAmount(Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0))}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${
                                  row.paid
                                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                    : "border-amber-200 bg-amber-100 text-amber-700"
                                }`}
                              >
                                {row.paid ? "SI" : "NO"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${deliveryStatusClass(row.status)}`}
                              >
                                {deliveryStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate" title={row.notes || "-"}>
                                {row.notes || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "received")}
                                  disabled={row.status === "RETIRADO"}
                                  className="h-7 gap-1 px-2 text-[10px]"
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Recibido
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "notified")}
                                  disabled={!row.client?.phone || row.status !== "RECIBIDO"}
                                  className="h-7 gap-1 px-2 text-[10px]"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Avisar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "retired")}
                                  disabled={!(row.status === "RECIBIDO" || row.status === "AVISADO_RETIRO")}
                                  className="h-7 gap-1 px-2 text-[10px]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Retirado
                                </Button>
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
                    Mostrando pagina {deliveryPagination.page} de {deliveryPagination.totalPages} ({deliveryPagination.total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={deliveryPagination.page <= 1 || deliveryLoading}
                      onClick={() =>
                        fetchDeliveries({
                          page: deliveryPagination.page - 1,
                          query: deliverySearch,
                          filter: deliveryFilter,
                        })
                      }
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={deliveryPagination.page >= deliveryPagination.totalPages || deliveryLoading}
                      onClick={() =>
                        fetchDeliveries({
                          page: deliveryPagination.page + 1,
                          query: deliverySearch,
                          filter: deliveryFilter,
                        })
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}


