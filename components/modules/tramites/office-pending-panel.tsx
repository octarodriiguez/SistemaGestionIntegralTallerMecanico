"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

type OfficeRow = {
  id: string;
  createdAt: string;
  status: "PENDIENTE_CARGA" | "CARGADO_WINPEC" | string;
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
  distributor: {
    name: string;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
  if (code === "RENOVACION_OBLEA") return "O";
  if (code === "PRUEBA_HIDRAULICA") return "PH";
  return displayName || "-";
}

export function OfficePendingPanel() {
  const [rows, setRows] = useState<OfficeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"PENDIENTE_CARGA" | "CARGADO_WINPEC" | "ALL">(
    "PENDIENTE_CARGA",
  );
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  async function fetchPending({
    query = search,
    page = pagination.page,
    nextStatus = status,
  }: {
    query?: string;
    page?: number;
    nextStatus?: "PENDIENTE_CARGA" | "CARGADO_WINPEC" | "ALL";
  } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("status", nextStatus);
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));

      const res = await fetch(`/api/tramites/oficina?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.details ? ` (${json.details})` : "";
        throw new Error((json.error ?? "No se pudo cargar pendientes de oficina.") + detail);
      }

      setRows(json.data ?? []);
      setPagination(
        json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al cargar pendientes de oficina.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending({ page: 1, nextStatus: status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function markWinpec(procedureId: string) {
    try {
      const res = await fetch("/api/tramites/oficina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId, action: "mark_winpec" }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json?.details ? ` (${json.details})` : "";
        throw new Error((json.error ?? "No se pudo actualizar estado.") + detail);
      }

      toast.success("Marcado como cargado en WINPEC.");
      await fetchPending({ page: pagination.page, query: search, nextStatus: status });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_120px]">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Buscar persona o dominio"
          />
        </div>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "PENDIENTE_CARGA" | "CARGADO_WINPEC" | "ALL")
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        >
          <option value="PENDIENTE_CARGA">Pendientes de carga</option>
          <option value="CARGADO_WINPEC">Cargados en WINPEC</option>
          <option value="ALL">Todos</option>
        </select>

        <Button
          onClick={() => fetchPending({ page: 1, query: search, nextStatus: status })}
          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          Buscar
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="w-[18%] px-3 py-2.5 font-medium">Cliente</th>
              <th className="w-[10%] px-3 py-2.5 font-medium">Telefono</th>
              <th className="w-[9%] px-3 py-2.5 font-medium">Dominio</th>
              <th className="w-[16%] px-3 py-2.5 font-medium">Vehiculo</th>
              <th className="w-[6%] px-3 py-2.5 font-medium">Tramite</th>
              <th className="w-[14%] px-3 py-2.5 font-medium">Distribuidora</th>
              <th className="w-[8%] px-3 py-2.5 font-medium">F. alta</th>
              <th className="w-[8%] px-3 py-2.5 font-medium">Estado</th>
              <th className="w-[11%] px-3 py-2.5 font-medium">Accion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Cargando pendientes...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No hay registros para este filtro.
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
                  <td className="px-3 py-2.5 text-slate-700">{row.client?.phone || "-"}</td>
                  <td className="px-3 py-2.5 font-semibold tracking-wide text-slate-700">
                    {row.vehicle?.domain || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{row.distributor?.name || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{formatDate(row.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${
                        row.status === "CARGADO_WINPEC"
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-amber-200 bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.status === "CARGADO_WINPEC" ? "CARGADO" : "PENDIENTE"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markWinpec(row.id)}
                      disabled={row.status === "CARGADO_WINPEC"}
                      className="h-7 gap-1 px-2 text-[10px]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      WINPEC
                    </Button>
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
            onClick={() =>
              fetchPending({
                page: pagination.page - 1,
                query: search,
                nextStatus: status,
              })
            }
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() =>
              fetchPending({
                page: pagination.page + 1,
                query: search,
                nextStatus: status,
              })
            }
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
