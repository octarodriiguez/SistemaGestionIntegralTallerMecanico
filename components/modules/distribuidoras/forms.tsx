"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type DistributorFormValues = {
  name: string;
  phone: string;
};

type DistributorFormProps = {
  title: string;
  initialValues?: Partial<DistributorFormValues>;
  onSubmit: (values: DistributorFormValues) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
};

export function DistributorForm({
  title,
  initialValues,
  onSubmit,
  onCancel,
  saving = false,
}: DistributorFormProps) {
  const [form, setForm] = useState<DistributorFormValues>({
    name: initialValues?.name ?? "",
    phone: initialValues?.phone ?? "",
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">Completa los datos de la distribuidora.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Nombre"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Telefono"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={saving}
          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

type PurchaseFormValues = {
  transactionDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  notes: string;
};

type PurchaseFormProps = {
  onSubmit: (values: PurchaseFormValues) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
};

export function PurchaseForm({ onSubmit, onCancel, saving = false }: PurchaseFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<PurchaseFormValues>({
    transactionDate: today,
    description: "",
    quantity: "1",
    unitPrice: "",
    notes: "",
  });

  const total =
    Number(form.quantity || 0) * Number(String(form.unitPrice || "0").replace(",", "."));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Nueva compra</h3>
        <p className="text-sm text-slate-600">Registra mercaderia recibida.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="date"
          value={form.transactionDate}
          onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <input
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Descripcion / Mercaderia"
        />
        <input
          type="number"
          min={1}
          step="1"
          value={form.quantity}
          onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Cantidad"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.unitPrice}
          onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Precio unitario"
        />
        <input
          readOnly
          value={Number.isNaN(total) ? "" : total.toFixed(2)}
          className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm outline-none sm:col-span-2"
          placeholder="Total neto"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 sm:col-span-2"
          placeholder="Notas (opcional)"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={saving}
          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          {saving ? "Guardando..." : "Guardar compra"}
        </Button>
      </div>
    </div>
  );
}

type PaymentFormValues = {
  transactionDate: string;
  amount: string;
  paymentMethod: string;
  description: string;
  notes: string;
};

type PaymentFormProps = {
  onSubmit: (values: PaymentFormValues) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
};

export function PaymentForm({ onSubmit, onCancel, saving = false }: PaymentFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<PaymentFormValues>({
    transactionDate: today,
    amount: "",
    paymentMethod: "CASH",
    description: "Pago efectivo",
    notes: "",
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Registrar pago</h3>
        <p className="text-sm text-slate-600">Registra pagos realizados.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="date"
          value={form.transactionDate}
          onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Monto"
        />
        <select
          value={form.paymentMethod}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              paymentMethod: e.target.value,
              description: e.target.value === "TRANSFER" ? "Pago transferencia" : "Pago efectivo",
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        >
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Transferencia</option>
        </select>
        <input
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Descripcion"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 sm:col-span-2"
          placeholder="Notas (opcional)"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => onSubmit(form)}
          disabled={saving}
          className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          {saving ? "Guardando..." : "Registrar pago"}
        </Button>
      </div>
    </div>
  );
}
