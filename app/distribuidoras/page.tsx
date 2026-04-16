"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, FileText, Package, Plus, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DistributorForm,
  PaymentForm,
  PurchaseForm,
} from "@/components/modules/distribuidoras/forms";
import { RecepcionModal } from "@/components/modules/distribuidoras/recepcion-modal";

type TransactionRow = {
  id: string;
  type: "PURCHASE" | "PAYMENT" | string;
  description: string | null;
  amount: number | null;
  transaction_date: string;
};

type DistributorRow = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  lastTransactions: TransactionRow[];
};

function balanceBadge(balance: number) {
  if (balance === 0) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  if (balance > 0) {
    return "border-rose-200 bg-rose-100 text-rose-700";
  }
  return "border-emerald-200 bg-emerald-100 text-emerald-700";
}

function balanceLabel(balance: number) {
  if (balance === 0) return "Saldado";
  if (balance > 0) return `Debe ${formatCurrency(balance)}`;
  return `A favor ${formatCurrency(Math.abs(balance))}`;
}

export default function DistribuidorasPage() {
  const [rows, setRows] = useState<DistributorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewModal, setOpenNewModal] = useState(false);
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openRecepcionModal, setOpenRecepcionModal] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<DistributorRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchDistributors() {
    setLoading(true);
    try {
      const res = await fetch("/api/distribuidoras", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar distribuidoras.");
      setRows(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar distribuidoras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDistributors();
  }, []);

  const totalDebt = useMemo(
    () => rows.filter((row) => row.balance > 0).length,
    [rows],
  );

  async function handleCreateDistributor(values: {
    name: string;
    phone: string;
  }) {
    setSaving(true);
    try {
      const res = await fetch("/api/distribuidoras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo crear.");
      toast.success("Distribuidora creada.");
      setOpenNewModal(false);
      await fetchDistributors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear distribuidora.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePurchase(values: {
    transactionDate: string;
    description: string;
    quantity: string;
    unitPrice: string;
    notes: string;
  }) {
    if (!selectedDistributor) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidoras/${selectedDistributor.id}/transactions`, {
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
      if (!res.ok) throw new Error(json.error ?? "No se pudo registrar la compra.");
      toast.success("Compra registrada.");
      setOpenPurchaseModal(false);
      await fetchDistributors();
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
    if (!selectedDistributor) return;
    const amountValue = Number(String(values.amount || "0").replace(",", "."));
    if (selectedDistributor.balance > 0 && amountValue > selectedDistributor.balance) {
      toast("Monto supera el saldo deudor actual.", { icon: "⚠️" });
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/distribuidoras/${selectedDistributor.id}/transactions`, {
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
      if (!res.ok) throw new Error(json.error ?? "No se pudo registrar el pago.");
      toast.success("Pago registrado.");
      setOpenPaymentModal(false);
      await fetchDistributors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar pago.");
    } finally {
      setSaving(false);
    }
  }

  function openPurchaseFor(row: DistributorRow) {
    setSelectedDistributor(row);
    setOpenPurchaseModal(true);
  }

  function openPaymentFor(row: DistributorRow) {
    setSelectedDistributor(row);
    setOpenPaymentModal(true);
  }

  function openRecepcionFor(row: DistributorRow) {
    setSelectedDistributor(row);
    setOpenRecepcionModal(true);
  }

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Distribuidoras"
      subtitle="Cuenta corriente y pagos por proveedor."
      headerActions={
        <Button
          onClick={() => setOpenNewModal(true)}
          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Nueva distribuidora
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-100">
          <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 font-semibold text-rose-700">
            Distribuidoras con deuda: {totalDebt}
          </span>
        </div>

        {loading ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="py-10 text-center text-slate-600">
              Cargando distribuidoras...
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="py-10 text-center text-slate-600">
              No hay distribuidoras cargadas.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row, idx) => (
              <Card
                key={row.id}
                className="rounded-2xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      {row.name}
                    </CardTitle>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${balanceBadge(row.balance)}`}>
                      {balanceLabel(row.balance)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {row.phone ? `Telefono: ${row.phone}` : "Sin telefono registrado"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Ultimas transacciones
                    </p>
                    <div className="mt-2 space-y-2 text-sm">
                      {row.lastTransactions.length === 0 ? (
                        <p className="text-slate-500">Sin movimientos.</p>
                      ) : (
                        row.lastTransactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between">
                            <div>
                              <p className="text-slate-700">{tx.description ?? "-"}</p>
                              <p className="text-xs text-slate-500">{formatDate(tx.transaction_date)}</p>
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                tx.type === "PURCHASE" ? "text-rose-600" : "text-emerald-600"
                              }`}
                            >
                              {tx.type === "PURCHASE" ? "+" : "-"} {formatCurrency(Number(tx.amount ?? 0))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/distribuidoras/${row.id}`}>
                      <Button variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
                        <Building2 className="h-4 w-4" />
                        Ver detalle
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                      onClick={() => openRecepcionFor(row)}
                    >
                      <Package className="h-4 w-4" />
                      Recibir mercadería
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => openPurchaseFor(row)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Registrar Ingreso
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      onClick={() => openPaymentFor(row)}
                    >
                      <CreditCard className="h-4 w-4" />
                      Registrar pago
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {openRecepcionModal && selectedDistributor ? (
        <RecepcionModal
          distributorId={selectedDistributor.id}
          distributorName={selectedDistributor.name}
          onClose={() => setOpenRecepcionModal(false)}
          onSuccess={async () => {
            setOpenRecepcionModal(false);
            await fetchDistributors();
          }}
        />
      ) : null}

      {openNewModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <DistributorForm
              title="Nueva distribuidora"
              onSubmit={handleCreateDistributor}
              onCancel={() => setOpenNewModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}

      {openPurchaseModal && selectedDistributor ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              {selectedDistributor.name}
            </div>
            <PurchaseForm
              onSubmit={handleCreatePurchase}
              onCancel={() => setOpenPurchaseModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}

      {openPaymentModal && selectedDistributor ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <FileText className="h-4 w-4" />
              {selectedDistributor.name}
            </div>
            <PaymentForm
              onSubmit={handleCreatePayment}
              onCancel={() => setOpenPaymentModal(false)}
              saving={saving}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
