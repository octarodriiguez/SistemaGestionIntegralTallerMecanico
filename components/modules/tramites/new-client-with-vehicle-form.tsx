"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

type ProcedureType = {
  id: string;
  code: string;
  display_name: string;
  requires_distributor: boolean;
  current_price: number | null;
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
  phTubes: "",
  brand: "",
  model: "",
  domain: "",
};

function getProcedureOptionLabel(item: ProcedureType) {
  if (item.code === "RENOVACION_OBLEA") return "OBLEA";
  if (item.code === "PRUEBA_HIDRAULICA") return "PH";
  return item.display_name;
}

function normalizePhoneForPreview(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits === "0") return "SIN TELEFONO";
  return digits;
}

function upsertNoteTag(raw: string, tag: string, value: string) {
  const trimmed = (raw || "").trim();
  const regex = new RegExp(`\\[${tag}:[^\\]]*\\]`, "gi");
  const cleaned = trimmed.replace(regex, "").trim();
  if (!value) return cleaned;
  return `${cleaned ? `${cleaned} ` : ""}[${tag}:${value}]`.trim();
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
  const [priceForm, setPriceForm] = useState({
    RENOVACION_OBLEA: "",
    PRUEBA_HIDRAULICA: "",
  });
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  async function fetchCatalogs() {
    try {
      const res = await fetch("/api/catalogos", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar los catalogos.");
      const json = await res.json();
      const nextProcedureTypes = json.data?.procedureTypes ?? [];
      setProcedureTypes(nextProcedureTypes);
      const priceMap = nextProcedureTypes.reduce(
        (acc: Record<string, string>, item: ProcedureType) => {
          if (item.code === "RENOVACION_OBLEA" || item.code === "PRUEBA_HIDRAULICA") {
            acc[item.code] =
              item.current_price !== null && item.current_price !== undefined
                ? String(item.current_price)
                : "";
          }
          return acc;
        },
        { RENOVACION_OBLEA: "", PRUEBA_HIDRAULICA: "" },
      );
      setPriceForm({
        RENOVACION_OBLEA: priceMap.RENOVACION_OBLEA ?? "",
        PRUEBA_HIDRAULICA: priceMap.PRUEBA_HIDRAULICA ?? "",
      });
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
  const hasFixedTotal = Boolean(
    selectedProcedureType?.code &&
      selectedProcedureType.code !== "REPARACION_VARIA" &&
      typeof selectedProcedureType.current_price === "number",
  );

  function handleProcedureTypeChange(procedureTypeId: string) {
    const nextProcedure = procedureTypes.find((item) => item.id === procedureTypeId) ?? null;
    const fixed = typeof nextProcedure?.current_price === "number" ? nextProcedure.current_price : undefined;

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
      phTubes: nextProcedure?.code === "PRUEBA_HIDRAULICA" ? prev.phTubes : "",
    }));
  }

  async function handleSavePrices() {
    const oblea = Number(priceForm.RENOVACION_OBLEA || 0);
    const ph = Number(priceForm.PRUEBA_HIDRAULICA || 0);

    if (Number.isNaN(oblea) || Number.isNaN(ph)) {
      toast.error("Precio invalido.");
      return;
    }

    setSavingPrices(true);
    try {
      const res = await fetch("/api/procedure-types/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prices: [
            { code: "RENOVACION_OBLEA", price: oblea },
            { code: "PRUEBA_HIDRAULICA", price: ph },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron guardar los precios.");
      toast.success("Precios actualizados.");
      await fetchCatalogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar precios.");
    } finally {
      setSavingPrices(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const totalAmountNumber = Number(form.totalAmount || 0);
      const amountPaidNumber = Number(form.amountPaid || 0);
      const isPh = selectedProcedureType?.code === "PRUEBA_HIDRAULICA";
      const normalizedNotes = isPh
        ? upsertNoteTag(form.procedureNotes, "TUBOS", form.phTubes.trim())
        : upsertNoteTag(form.procedureNotes, "TUBOS", "");

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        procedureTypeId: form.procedureTypeId,
        distributorId: form.distributorId,
        procedureNotes: normalizedNotes,
        paid: amountPaidNumber >= totalAmountNumber && totalAmountNumber > 0,
        totalAmount: totalAmountNumber,
        amountPaid: amountPaidNumber,
        vehicle: {
          brand: form.brand,
          model: form.model,
          domain: form.domain,
        },
      };

      const phonePreview = normalizePhoneForPreview(form.phone);
      const confirmResult = await Swal.fire({
        title: "Confirmar telefono",
        text: `Se va a guardar este telefono: ${phonePreview}`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
      });
      if (!confirmResult.isConfirmed) {
        setSaving(false);
        return;
      }

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
          Precios de tramites
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_160px]">
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceForm.RENOVACION_OBLEA}
            onChange={(e) => setPriceForm((prev) => ({ ...prev, RENOVACION_OBLEA: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Precio oblea"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={priceForm.PRUEBA_HIDRAULICA}
            onChange={(e) => setPriceForm((prev) => ({ ...prev, PRUEBA_HIDRAULICA: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Precio PH"
          />
          <Button
            type="button"
            onClick={handleSavePrices}
            disabled={savingPrices}
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            {savingPrices ? "Guardando..." : "Guardar precios"}
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Datos del cliente
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value.toUpperCase() }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Apellido"
          />
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value.toUpperCase() }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Nombre"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Telefono (opcional, 0 para omitir)"
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
            onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value.toUpperCase() }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Marca"
          />
          <input
            required
            value={form.model}
            onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value.toUpperCase() }))}
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

          {selectedProcedureType?.code === "PRUEBA_HIDRAULICA" ? (
            <input
              type="number"
              min={1}
              step="1"
              required
              value={form.phTubes}
              onChange={(e) => setForm((prev) => ({ ...prev, phTubes: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              placeholder="Cantidad de tubos"
            />
          ) : null}

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
          onChange={(e) => setForm((prev) => ({ ...prev, procedureNotes: e.target.value.toUpperCase() }))}
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
