"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type ProcedureType = {
  id: string;
  code: string;
  display_name: string;
  requires_distributor: boolean;
};

type Distributor = {
  id: string;
  name: string;
};

const initialForm = {
  firstName: "",
  lastName: "",
  phone: "",
  procedureTypeId: "",
  distributorId: "",
  totalAmount: "",
  amountPaid: "",
  procedureNotes: "",
  brand: "",
  model: "",
  domain: "",
  year: "",
};

const FIXED_TOTAL_BY_CODE: Record<string, number> = {
  RENOVACION_OBLEA: 30000,
  PRUEBA_HIDRAULICA: 180000,
};

function getProcedureOptionLabel(item: ProcedureType) {
  if (item.code === "RENOVACION_OBLEA") return "O";
  if (item.code === "PRUEBA_HIDRAULICA") return "PH";
  return item.display_name;
}

type Props = {
  compact?: boolean;
  onSuccess?: () => Promise<void> | void;
};

export function NewClientWithVehicleForm({ compact = false, onSuccess }: Props) {
  const [form, setForm] = useState(initialForm);
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  async function fetchCatalogs() {
    try {
      const res = await fetch("/api/catalogos", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar los catalogos.");
      const json = await res.json();
      setProcedureTypes(json.data?.procedureTypes ?? []);
      setDistributors(json.data?.distributors ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar catalogos.");
    }
  }

  const selectedProcedureType = useMemo(
    () => procedureTypes.find((item) => item.id === form.procedureTypeId) ?? null,
    [procedureTypes, form.procedureTypeId],
  );

  const isReparacionVaria = selectedProcedureType?.code === "REPARACION_VARIA";
  const hasFixedTotal = Boolean(selectedProcedureType?.code && FIXED_TOTAL_BY_CODE[selectedProcedureType.code]);

  function handleProcedureTypeChange(procedureTypeId: string) {
    const nextProcedure = procedureTypes.find((item) => item.id === procedureTypeId) ?? null;
    const fixed = nextProcedure?.code ? FIXED_TOTAL_BY_CODE[nextProcedure.code] : undefined;

    setForm((prev) => ({
      ...prev,
      procedureTypeId,
      distributorId: "",
      totalAmount:
        typeof fixed === "number"
          ? String(fixed)
          : nextProcedure?.code === "REPARACION_VARIA"
            ? prev.totalAmount
            : "",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const totalAmountNumber = Number(form.totalAmount || 0);
      const amountPaidNumber = Number(form.amountPaid || 0);

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        procedureTypeId: form.procedureTypeId,
        distributorId: form.distributorId,
        procedureNotes: form.procedureNotes,
        paid: amountPaidNumber >= totalAmountNumber && totalAmountNumber > 0,
        totalAmount: totalAmountNumber,
        amountPaid: amountPaidNumber,
        vehicle: {
          brand: form.brand,
          model: form.model,
          domain: form.domain,
          year: form.year ? Number(form.year) : undefined,
        },
      };

      console.log("[tramites] payload alta cliente", payload);

      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("[tramites] error alta cliente", json);
        const detailMessage =
          json?.details?.fieldErrors
            ? Object.values(json.details.fieldErrors).flat().find(Boolean)
            : null;
        throw new Error(json.error ?? detailMessage ?? "No se pudo guardar.");
      }

      toast.success("Cliente y tramite guardados.");
      setForm(initialForm);
      await onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Datos del cliente
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Apellido"
          />
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Nombre"
          />
          <input
            required
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Telefono"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Datos del vehiculo
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            required
            value={form.brand}
            onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Marca"
          />
          <input
            required
            value={form.model}
            onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Modelo"
          />
          <input
            required
            value={form.domain}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, domain: e.target.value.toUpperCase() }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-400"
            placeholder="Dominio"
          />
          <input
            value={form.year}
            onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Anio"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Datos del tramite
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            required
            value={form.procedureTypeId}
            onChange={(e) => handleProcedureTypeChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          >
            <option value="">Selecciona tipo de tramite...</option>
            {procedureTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {getProcedureOptionLabel(item)}
              </option>
            ))}
          </select>

          <select
            required={Boolean(selectedProcedureType?.requires_distributor)}
            value={form.distributorId}
            onChange={(e) => setForm((prev) => ({ ...prev, distributorId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          >
            <option value="">
              {selectedProcedureType?.requires_distributor
                ? "Selecciona distribuidora..."
                : "Distribuidora (opcional)"}
            </option>
            {distributors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            step="0.01"
            required
            readOnly={hasFixedTotal && !isReparacionVaria}
            value={form.totalAmount}
            onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none read-only:bg-slate-100 focus:border-slate-400"
            placeholder="Total a pagar"
          />

          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={form.amountPaid}
            onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Monto abonado"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Observaciones
        </p>
        <textarea
          value={form.procedureNotes}
          onChange={(e) => setForm((prev) => ({ ...prev, procedureNotes: e.target.value }))}
          className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Detalle de lo realizado (opcional)"
        />
      </div>

      <Button
        type="submit"
        disabled={saving}
        className={`rounded-xl bg-slate-900 text-white hover:bg-slate-800 ${compact ? "w-auto px-5" : "w-full"}`}
      >
        <Plus className="h-4 w-4" />
        {saving ? "Guardando..." : "Guardar alta"}
      </Button>
    </form>
  );
}
