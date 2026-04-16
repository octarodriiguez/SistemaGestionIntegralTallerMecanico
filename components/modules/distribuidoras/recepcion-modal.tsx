"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type ProcedureItem = {
  id: string;
  createdAt: string;
  client: { firstName: string; lastName: string } | null;
  procedureType: { code: string; displayName: string } | null;
  vehicle: { brand: string; model: string; domain: string } | null;
};

type ReceptionLine = {
  type: "OBLEA" | "PH";
  quantity: string;
  unitPrice: string;
  procedureIds: string[];
};

type Props = {
  distributorId: string;
  distributorName: string;
  onClose: () => void;
  onSuccess: () => void;
};

function formatDate(value: string) {
  const d = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  return d;
}

export function RecepcionModal({ distributorId, distributorName, onClose, onSuccess }: Props) {
  const today = new Date().toLocaleDateString("en-CA");

  // Step 1: build lines; Step 2: select procedures per line
  const [step, setStep] = useState<1 | 2>(1);
  const [transactionDate, setTransactionDate] = useState(today);
  const [lines, setLines] = useState<ReceptionLine[]>([
    { type: "OBLEA", quantity: "", unitPrice: "", procedureIds: [] },
  ]);

  // Step 2: which line index we're assigning procedures to
  const [activeLine, setActiveLine] = useState(0);
  const [pendingByType, setPendingByType] = useState<Record<string, ProcedureItem[]>>({});
  const [loadingPending, setLoadingPending] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch pending procedures for all types used in lines
  async function fetchPending() {
    setLoadingPending(true);
    try {
      const types = Array.from(new Set(lines.map((l) => l.type)));
      const results: Record<string, ProcedureItem[]> = {};
      await Promise.all(
        types.map(async (type) => {
          const res = await fetch(
            `/api/distribuidoras/${distributorId}/recepcion?type=${type}`,
            { cache: "no-store" },
          );
          const json = await res.json();
          results[type] = json.data ?? [];
        }),
      );
      setPendingByType(results);
    } catch {
      toast.error("No se pudieron cargar tramites pendientes.");
    } finally {
      setLoadingPending(false);
    }
  }

  function addLine() {
    setLines((prev) => [...prev, { type: "OBLEA", quantity: "", unitPrice: "", procedureIds: [] }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, patch: Partial<ReceptionLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function toggleProcedure(lineIdx: number, procedureId: string) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== lineIdx) return l;
        const already = l.procedureIds.includes(procedureId);
        return {
          ...l,
          procedureIds: already
            ? l.procedureIds.filter((id) => id !== procedureId)
            : [...l.procedureIds, procedureId],
        };
      }),
    );
  }

  // Auto-fill quantity from selected procedures count
  useEffect(() => {
    if (step !== 2) return;
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        quantity: l.procedureIds.length > 0 ? String(l.procedureIds.length) : l.quantity,
      })),
    );
  }, [lines.map((l) => l.procedureIds.length).join(","), step]);

  const totalAmount = lines.reduce((acc, l) => {
    const qty = Number(l.quantity) || 0;
    const price = Number(String(l.unitPrice).replace(",", ".")) || 0;
    return acc + qty * price;
  }, 0);

  const canProceedToStep2 = lines.every(
    (l) => l.type && Number(l.quantity) > 0 && Number(String(l.unitPrice).replace(",", ".")) > 0,
  );

  async function handleConfirm() {
    const hasSelections = lines.some((l) => l.procedureIds.length > 0);
    if (!hasSelections) {
      toast.error("Seleccioná al menos un trámite.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        transactionDate,
        lines: lines
          .filter((l) => l.procedureIds.length > 0)
          .map((l) => ({
            type: l.type,
            quantity: l.procedureIds.length,
            unitPrice: Number(String(l.unitPrice).replace(",", ".")),
            procedureIds: l.procedureIds,
          })),
      };

      const res = await fetch(`/api/distribuidoras/${distributorId}/recepcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo registrar.");

      toast.success(`Recepción registrada. ${json.data?.proceduresUpdated ?? 0} trámites actualizados.`);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrar recepción.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-10 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Package className="h-4 w-4" />
            {distributorName}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {step === 1 ? "Registrar recepción de mercadería" : "Asignar trámites recibidos"}
          </h3>
          <p className="text-sm text-slate-500">
            {step === 1
              ? "Ingresá los tipos y cantidades recibidas."
              : "Seleccioná qué trámites corresponden a cada línea."}
          </p>
        </div>

        {/* Step 1: Lines */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Fecha</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const qty = Number(line.quantity) || 0;
                const price = Number(String(line.unitPrice).replace(",", ".")) || 0;
                const subtotal = qty * price;
                return (
                  <div key={idx} className="grid grid-cols-[100px_1fr_1fr_90px_32px] gap-2 items-center">
                    <select
                      value={line.type}
                      onChange={(e) => updateLine(idx, { type: e.target.value as "OBLEA" | "PH", procedureIds: [] })}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="OBLEA">OBLEA</option>
                      <option value="PH">PH</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      placeholder="Cantidad"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      placeholder="Precio unitario"
                    />
                    <span className="text-sm text-slate-700 text-right font-medium">
                      {subtotal > 0
                        ? subtotal.toLocaleString("es-AR", { minimumFractionDigits: 0 })
                        : "-"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <Plus className="h-4 w-4" />
              Agregar línea
            </button>

            {totalAmount > 0 && (
              <div className="flex justify-end border-t border-slate-100 pt-3">
                <span className="text-sm font-semibold text-slate-900">
                  Total: ${totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                disabled={!canProceedToStep2}
                onClick={() => { fetchPending(); setStep(2); }}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                Siguiente → Asignar trámites
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Assign procedures */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Tab per line */}
            <div className="flex gap-2 flex-wrap">
              {lines.map((line, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveLine(idx)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition ${
                    activeLine === idx
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {line.type} ×{line.quantity}
                  {line.procedureIds.length > 0 && (
                    <span className="ml-1 text-xs opacity-70">({line.procedureIds.length} sel.)</span>
                  )}
                </button>
              ))}
            </div>

            {loadingPending ? (
              <p className="text-sm text-slate-500 py-4 text-center">Cargando trámites pendientes...</p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                {(pendingByType[lines[activeLine]?.type] ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay trámites pendientes de recibir para {lines[activeLine]?.type}.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-3 py-2 w-8">
                          <input
                            type="checkbox"
                            checked={
                              (pendingByType[lines[activeLine]?.type] ?? []).every((p) =>
                                lines[activeLine]?.procedureIds.includes(p.id),
                              )
                            }
                            onChange={(e) => {
                              const all = (pendingByType[lines[activeLine]?.type] ?? []).map((p) => p.id);
                              updateLine(activeLine, {
                                procedureIds: e.target.checked ? all : [],
                              });
                            }}
                          />
                        </th>
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Dominio</th>
                        <th className="px-3 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pendingByType[lines[activeLine]?.type] ?? []).map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleProcedure(activeLine, p.id)}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={lines[activeLine]?.procedureIds.includes(p.id)}
                              onChange={() => toggleProcedure(activeLine, p.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {p.client
                              ? `${p.client.lastName}, ${p.client.firstName}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-mono text-xs">
                            {p.vehicle?.domain ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-xs">
                            {formatDate(p.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm space-y-1">
              {lines.map((l, idx) => {
                const qty = l.procedureIds.length || Number(l.quantity) || 0;
                const price = Number(String(l.unitPrice).replace(",", ".")) || 0;
                return (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>{l.type} ×{qty} @ ${price.toLocaleString("es-AR")}</span>
                    <span className="font-medium">
                      ${(qty * price).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                );
              })}
              <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                <span>Total</span>
                <span>${totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Volver</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button
                  disabled={saving || lines.every((l) => l.procedureIds.length === 0)}
                  onClick={handleConfirm}
                  className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {saving ? "Guardando..." : "Confirmar recepción"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
