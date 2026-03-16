"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { DistributorForm } from "@/components/modules/distribuidoras/forms";

export default function NuevaDistribuidoraPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleCreate(values: {
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
      router.push("/distribuidoras");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear distribuidora.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell sectionLabel="Modulo" title="Distribuidoras" subtitle="Alta de proveedor.">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="p-6">
            <DistributorForm
              title="Nueva distribuidora"
              onSubmit={handleCreate}
              onCancel={() => router.push("/distribuidoras")}
              saving={saving}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
