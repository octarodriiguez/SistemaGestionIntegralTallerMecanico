"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ProcedureType = {
  id: string;
  code: string;
  display_name: string;
  current_price: number | null;
};

export default function ConfiguracionPage() {
  const [procedureTypes, setProcedureTypes] = useState<ProcedureType[]>([]);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar catalogos.");
    }
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

  return (
    <AppShell sectionLabel="Modulo" title="Configuracion" subtitle="Parametros generales del sistema.">
      <div className="mx-auto w-full max-w-[1100px]">
        <Card className="rounded-2xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">Precios de tramites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <p className="text-xs text-slate-500">
              Estos valores se usan como total automatico en los tramites de Oblea y PH.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
