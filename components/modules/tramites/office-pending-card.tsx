"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficePendingPanel } from "@/components/modules/tramites/office-pending-panel";

export function OfficePendingCard() {
  const [canView, setCanView] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        setCanView(res.ok && json.data?.role === "OFICINA");
      } catch {
        if (!mounted) return;
        setCanView(false);
      } finally {
        if (!mounted) return;
        setChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!checked || !canView) return null;

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl text-slate-900">
          Pendientes de oficina (no reparacion varia)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <OfficePendingPanel />
      </CardContent>
    </Card>
  );
}
