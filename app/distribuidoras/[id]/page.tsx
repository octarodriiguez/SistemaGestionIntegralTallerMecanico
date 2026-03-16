"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DistributorForm,
  PaymentForm,
  PurchaseForm,
} from "@/components/modules/distribuidoras/forms";

type Distributor = {
  id: string;
  name: string;
  phone: string | null;
  created_at?: string;
};

type TransactionRow = {
  id: string;
  type: "PURCHASE" | "PAYMENT" | string;
  description: string | null;
  amount: number;
  paymentMethod: string | null;
  quantity: number | null;
  unitPrice: number | null;
  transactionDate: string;
  notes: string | null;
  runningBalance: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Totals = {
  debe: number;
  haber: number;
  balance: number;
};

const pdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
  },
  title: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    paddingVertical: 4,
    backgroundColor: "#f8fafc",
  },
  cell: {
    flex: 1,
    paddingRight: 4,
  },
});

function balanceBadge(balance: number) {
  if (balance === 0) return "border-slate-200 bg-slate-100 text-slate-700";
  if (balance > 0) return "border-rose-200 bg-rose-100 text-rose-700";
  return "border-emerald-200 bg-emerald-100 text-emerald-700";
}

function balanceLabel(balance: number) {
  if (balance === 0) return "Saldado";
  if (balance > 0) return `Debe ${formatCurrency(balance)}`;
  return `A favor ${formatCurrency(Math.abs(balance))}`;
}

export default function DistribuidoraDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const distributorId = params?.id;

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [totals, setTotals] = useState<Totals>({ debe: 0, haber: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchDistributor() {
    if (!distributorId) return;
    try {
      const res = await fetch(`/api/distribuidoras/${distributorId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar distribuidora.");
      setDistributor(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar distribuidora.");
    }
  }

  async function fetchTransactions(page = pagination.page) {
    if (!distributorId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (query.trim()) params.set("q", query.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/distribuidoras/${distributorId}/transactions?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar transacciones.");
      setTransactions(json.data ?? []);
      setPagination(json.pagination ?? pagination);
      setTotals(json.totals ?? totals);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar transacciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDistributor();
    fetchTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributorId]);

  const balanceHistory = useMemo(() => {
    const ordered = [...transactions].sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime(),
    );
    return ordered.map((item) => item.runningBalance);
  }, [transactions]);

  async function handleCreatePurchase(values: {
    transactionDate: string;
    description: string;
    quantity: string;
    unitPrice: string;
    notes: string;
  }) {
    if (!distributorId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidoras/${distributorId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PURCHASE",
          transactionDate: values.transactionDate,
          description: values.description,
          quantity: Number(values.quantity),
          unitPrice: Number(String(values.unitPrice || "0").replace(",", ".")),
          notes: values.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo registrar compra.");
      toast.success("Compra registrada.");
      setOpenPurchaseModal(false);
      await fetchTransactions(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar compra.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePayment(values: {
    transactionDate: string;
    amount: string;
    paymentMethod: string;
    description: string;
    notes: string;
  }) {
    if (!distributorId) return;
    const amountValue = Number(String(values.amount || "0").replace(",", "."));
    if (totals.balance > 0 && amountValue > totals.balance) {
      toast("Monto supera el saldo deudor actual.", { icon: "⚠️" });
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidoras/${distributorId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT",
          transactionDate: values.transactionDate,
          amount: amountValue,
          paymentMethod: values.paymentMethod,
          description: values.description,
          notes: values.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo registrar pago.");
      toast.success("Pago registrado.");
      setOpenPaymentModal(false);
      await fetchTransactions(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar pago.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateDistributor(values: {
    name: string;
    phone: string;
  }) {
    if (!distributorId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidoras/${distributorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar.");
      toast.success("Distribuidora actualizada.");
      setOpenEditModal(false);
      await fetchDistributor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar distribuidora.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDistributor() {
    if (!distributorId) return;
    const result = await Swal.fire({
      title: "Eliminar distribuidora",
      text: "Esta accion no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/distribuidoras/${distributorId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo eliminar.");
      toast.success("Distribuidora eliminada.");
      router.push("/distribuidoras");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar distribuidora.");
    }
  }

  function downloadCsv() {
    const headers = [
      "Fecha",
      "Descripcion",
      "Cantidad",
      "Precio Unitario",
      "Total",
      "Debe",
      "Haber",
      "Saldo",
    ];
    const rows = transactions.map((tx) => {
      const debe = tx.type === "PURCHASE" ? tx.amount : 0;
      const haber = tx.type === "PAYMENT" ? tx.amount : 0;
      return [
        formatDate(tx.transactionDate),
        tx.description ?? "",
        tx.quantity ?? "",
        tx.unitPrice ?? "",
        tx.amount ?? 0,
        debe,
        haber,
        tx.runningBalance,
      ];
    });
    const csv = [headers.join(","), ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `distribuidora_${distributor?.name ?? "detalle"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const rowsData = transactions.map((tx) => {
      const debe = tx.type === "PURCHASE" ? tx.amount : 0;
      const haber = tx.type === "PAYMENT" ? tx.amount : 0;
      return [
        formatDate(tx.transactionDate),
        tx.description ?? "-",
        tx.quantity ?? "-",
        tx.unitPrice !== null && tx.unitPrice !== undefined ? formatCurrency(Number(tx.unitPrice)) : "-",
        formatCurrency(Number(tx.amount)),
        debe ? formatCurrency(Number(debe)) : "-",
        haber ? formatCurrency(Number(haber)) : "-",
        formatCurrency(Number(tx.runningBalance)),
      ];
    });

    const doc = (
      <Document>
        <Page size="A4" orientation="landscape" style={pdfStyles.page}>
          <Text style={pdfStyles.title}>
            Cuenta corriente - {distributor?.name ?? "Distribuidora"}
          </Text>
          <View style={pdfStyles.headerRow}>
            {["Fecha", "Descripcion", "Cant.", "Precio Unit", "Total", "Debe", "Haber", "Saldo"].map((h) => (
              <Text key={h} style={pdfStyles.cell}>{h}</Text>
            ))}
          </View>
          {rowsData.map((line, idx) => (
            <View key={`tx-pdf-${idx}`} style={pdfStyles.row}>
              {line.map((cell, cellIdx) => (
                <Text key={`tx-pdf-${idx}-${cellIdx}`} style={pdfStyles.cell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </Page>
      </Document>
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuenta_corriente_${distributor?.name ?? "distribuidora"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell hideHeader sectionLabel="Modulo" title="Distribuidoras" subtitle="Detalle de cuenta corriente.">
      <div className="grid gap-3 lg:grid-cols-[1fr_300px] lg:items-start">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl text-slate-900">Transacciones</CardTitle>
            <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_170px_140px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                placeholder="Buscar descripcion"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              >
                <option value="">Todos</option>
                <option value="PURCHASE">Compras</option>
                <option value="PAYMENT">Pagos</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => fetchTransactions(1)}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                Buscar
              </Button>
              <Button variant="outline" onClick={downloadCsv}>
                <FileSpreadsheet className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button variant="outline" onClick={downloadPdf}>
                <FileText className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200">
              <table className="w-full table-auto text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium">Descripcion</th>
                    <th className="px-3 py-2.5 font-medium">Cant.</th>
                    <th className="px-3 py-2.5 font-medium">Precio Unit</th>
                    <th className="px-3 py-2.5 font-medium">Total</th>
                    <th className="px-3 py-2.5 font-medium">Debe</th>
                    <th className="px-3 py-2.5 font-medium">Haber</th>
                    <th className="px-3 py-2.5 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Cargando transacciones...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No hay transacciones.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 text-slate-700">{formatDate(tx.transactionDate)}</td>
                        <td className="px-3 py-2.5 text-slate-700">{tx.description || "-"}</td>
                        <td className="px-3 py-2.5 text-slate-700">{tx.quantity ?? "-"}</td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {tx.unitPrice !== null && tx.unitPrice !== undefined
                            ? formatCurrency(Number(tx.unitPrice))
                            : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{formatCurrency(Number(tx.amount))}</td>
                        <td className="px-3 py-2.5 text-rose-600">
                          {tx.type === "PURCHASE" ? formatCurrency(Number(tx.amount)) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-emerald-600">
                          {tx.type === "PAYMENT" ? formatCurrency(Number(tx.amount)) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{formatCurrency(Number(tx.runningBalance))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <td className="px-3 py-2.5" colSpan={5}>Totales</td>
                    <td className="px-3 py-2.5 text-rose-600">{formatCurrency(totals.debe)}</td>
                    <td className="px-3 py-2.5 text-emerald-600">{formatCurrency(totals.haber)}</td>
                    <td className="px-3 py-2.5">{formatCurrency(totals.balance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">
                Pagina {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchTransactions(pagination.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchTransactions(pagination.page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl text-slate-900">{distributor?.name || "-"}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${balanceBadge(totals.balance)}`}>
                  {balanceLabel(totals.balance)}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpenEditModal(true)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteDistributor}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{distributor?.phone || "-"}</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => setOpenPurchaseModal(true)}
                  className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <ArrowDown className="h-4 w-4" />
                  Ingreso
                </Button>
                <Button
                  onClick={() => setOpenPaymentModal(true)}
                  className="w-full rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                >
                  <ArrowUp className="h-4 w-4" />
                  Pago
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl text-slate-900">Estadisticas</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BarChart3 className="h-4 w-4" />
                Evolucion del saldo
              </div>
            </CardHeader>
            <CardContent>
              {balanceHistory.length === 0 ? (
                <p className="text-sm text-slate-500">Sin datos.</p>
              ) : (
                <div className="flex items-end gap-1">
                  {balanceHistory.slice(-12).map((value, index) => {
                    const height = Math.min(Math.max(Math.abs(value) / 1000, 6), 60);
                    return (
                      <div
                        key={`bar-${index}`}
                        style={{ height }}
                        className={`w-2 rounded-full ${value >= 0 ? "bg-rose-400" : "bg-emerald-400"}`}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {openPurchaseModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <PurchaseForm
              onSubmit={handleCreatePurchase}
              onCancel={() => setOpenPurchaseModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}

      {openPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <PaymentForm
              onSubmit={handleCreatePayment}
              onCancel={() => setOpenPaymentModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}

      {openEditModal && distributor ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <DistributorForm
              title="Editar distribuidora"
              initialValues={{
                name: distributor.name,
                phone: distributor.phone ?? "",
              }}
              onSubmit={handleUpdateDistributor}
              onCancel={() => setOpenEditModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

