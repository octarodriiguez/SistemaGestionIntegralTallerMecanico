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
  email: "",
  procedureTypeId: "",
  distributorId: "",
  procedureNotes: "",
  paid: false,
  amountPaid: "",
  brand: "",
  model: "",
  domain: "",
  year: "",
};

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        procedureTypeId: form.procedureTypeId,
        distributorId: form.distributorId,
        procedureNotes: form.procedureNotes,
        paid: form.paid,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : 0,
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
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.firstName}
          onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Nombre"
        />
        <input
          required
          value={form.lastName}
          onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Apellido"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Telefono"
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          placeholder="Email (opcional)"
        />
      </div>

      <select
        required
        value={form.procedureTypeId}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, procedureTypeId: e.target.value, distributorId: "" }))
        }
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
      >
        <option value="">Selecciona tipo de tramite...</option>
        {procedureTypes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.display_name}
          </option>
        ))}
      </select>

      <select
        required={Boolean(selectedProcedureType?.requires_distributor)}
        value={form.distributorId}
        onChange={(e) => setForm((prev) => ({ ...prev, distributorId: e.target.value }))}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
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

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          required
          value={form.paid ? "SI" : "NO"}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              paid: e.target.value === "SI",
              amountPaid: e.target.value === "SI" ? prev.amountPaid : "",
            }))
          }
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        >
          <option value="NO">No pagado</option>
          <option value="SI">Pagado</option>
        </select>
        <input
          type="number"
          min={0}
          step="0.01"
          required={form.paid}
          disabled={!form.paid}
          value={form.amountPaid}
          onChange={(e) => setForm((prev) => ({ ...prev, amountPaid: e.target.value }))}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-slate-400"
          placeholder="Monto abonado"
        />
      </div>

      <textarea
        value={form.procedureNotes}
        onChange={(e) => setForm((prev) => ({ ...prev, procedureNotes: e.target.value }))}
        className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
        placeholder="Observacion del tramite (opcional)"
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Vehiculo (obligatorio)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
