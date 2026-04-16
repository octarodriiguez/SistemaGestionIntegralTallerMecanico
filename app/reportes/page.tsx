"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Award, AlertTriangle,
  DollarSign, CreditCard, Clock, Building2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReportData = {
  year: number;
  compareYear: number;
  summary: {
    totalCurrent: number;
    totalPrev: number;
    revenueCurrent: number;
    revenuePrev: number;
    growthPct: number | null;
  };
  monthlyComparison: { month: string; [key: string]: number | string }[];
  byType: { name: string; value: number }[];
  bestMonth: { name: string; count: number; idx: number } | null;
  worstMonth: { name: string; count: number; idx: number } | null;
  weekly: { week: string; count: number }[];
  weeklyComparison: { week: string; current: number; prev: number }[];
  currentMonthName: string;
  prevMonthName: string;
  financial: {
    summary: {
      revenueCurrent: number;
      collectedCurrent: number;
      pendingCurrent: number;
      revenuePrev: number;
      revenueGrowthPct: number | null;
      totalDistDebt: number;
      totalDistCredit: number;
    };
    byMonthFinancial: { month: string; facturado: number; facturadoPrev: number; cobrado: number; pendiente: number }[];
    revenueByTypeArr: { name: string; count: number; revenue: number; collected: number; pending: number }[];
    distBalances: { id: string; name: string; balance: number; purchasesThisYear: number }[];
    marginByMonth: { month: string; facturado: number; compras: number; margen: number }[];
  };
};

const PIE_COLORS = ["#0f172a", "#475569", "#94a3b8", "#cbd5e1", "#e2e8f0"];

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Icon className="h-4 w-4 text-slate-600" />
            </div>
            {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-rose-500" />}
            {trend === "neutral" && <Minus className="h-4 w-4 text-slate-400" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const currentYear = new Date().getFullYear();

export default function ReportesPage() {
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"operativo" | "financiero">("operativo");

  async function fetchReport(y: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes?year=${y}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport(year);
  }, [year]);

  const growthPct = data?.summary?.growthPct ?? null;
  const growthTrend =
    growthPct === null ? "neutral" : growthPct > 0 ? "up" : growthPct < 0 ? "down" : "neutral";

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Reportes"
      subtitle="Estadísticas y comparativas de trámites."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            {(["operativo", "financiero"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}>
                {t === "operativo" ? "Operativo" : "Financiero"}
              </button>
            ))}
          </div>
          <label className="text-sm font-medium text-slate-700">Año</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {loading && <span className="text-sm text-slate-400">Cargando...</span>}
        </div>

        {data && !loading && (
          <>
            {/* ── OPERATIVO ─────────────────────────────────────────────── */}
            {tab === "operativo" && (
              <>
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title={`Trámites ${year}`}
                value={data.summary.totalCurrent}
                sub={`vs ${data.summary.totalPrev} en ${data.compareYear}`}
                icon={BarChart3}
                trend={growthTrend}
              />
              <StatCard
                title="Variación anual"
                value={growthPct !== null ? `${growthPct > 0 ? "+" : ""}${growthPct}%` : "—"}
                sub={`${data.compareYear} → ${year}`}
                icon={TrendingUp}
                trend={growthTrend}
              />
              <StatCard
                title="Mejor mes"
                value={data.bestMonth?.name ?? "—"}
                sub={data.bestMonth ? `${data.bestMonth.count} trámites` : undefined}
                icon={Award}
              />
              <StatCard
                title="Peor mes"
                value={data.worstMonth?.name ?? "—"}
                sub={data.worstMonth ? `${data.worstMonth.count} trámites` : undefined}
                icon={AlertTriangle}
              />
            </div>

            {/* Monthly comparison bar chart */}
            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">
                  Trámites por mes — {year} vs {data.compareYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthlyComparison} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey={String(year)} fill="#0f172a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(data.compareYear)} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By type + weekly side by side */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* By type pie */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">
                    Por tipo de trámite — {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.byType}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {data.byType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[100px]">
                      {data.byType.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-slate-700">{item.name}</span>
                          <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly comparison current vs prev month */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">
                    Semanas — {data.currentMonthName} vs {data.prevMonthName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.weeklyComparison} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      <Bar dataKey="current" name={data.currentMonthName} fill="#0f172a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="prev" name={data.prevMonthName} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Revenue line chart */}
            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">
                  Facturación mensual — {year} vs {data.compareYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                      formatter={(v: any) => [`$${formatCurrency(v)}`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name={String(year)}
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#0f172a" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenuePrev"
                      name={String(data.compareYear)}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: "#94a3b8" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </>
            )}

            {/* ── FINANCIERO ────────────────────────────────────────────── */}
            {tab === "financiero" && (
              <div className="space-y-5">
                {/* Summary cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard title={`Facturado ${year}`}
                    value={`$${formatCurrency(data.financial.summary.revenueCurrent)}`}
                    sub={`vs $${formatCurrency(data.financial.summary.revenuePrev)} en ${data.compareYear}`}
                    icon={DollarSign}
                    trend={data.financial.summary.revenueGrowthPct === null ? "neutral" : data.financial.summary.revenueGrowthPct > 0 ? "up" : "down"}
                  />
                  <StatCard title="Cobrado"
                    value={`$${formatCurrency(data.financial.summary.collectedCurrent)}`}
                    sub={`${data.financial.summary.revenueCurrent > 0 ? Math.round((data.financial.summary.collectedCurrent / data.financial.summary.revenueCurrent) * 100) : 0}% del total`}
                    icon={CreditCard}
                  />
                  <StatCard title="Pendiente de cobro"
                    value={`$${formatCurrency(data.financial.summary.pendingCurrent)}`}
                    sub="Saldo sin cobrar"
                    icon={Clock}
                  />
                  <StatCard title="Deuda distribuidoras"
                    value={`$${formatCurrency(data.financial.summary.totalDistDebt)}`}
                    sub={data.financial.summary.totalDistCredit > 0 ? `A favor: $${formatCurrency(data.financial.summary.totalDistCredit)}` : "Sin saldo a favor"}
                    icon={Building2}
                  />
                </div>

                {/* Facturado vs Cobrado area */}
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Facturación y cobros por mes — {year}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={data.financial.byMonthFinancial}>
                        <defs>
                          <linearGradient id="gradFact" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#0f172a" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradCob" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                          formatter={(v: any) => [`$${formatCurrency(v)}`, ""]} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Area type="monotone" dataKey="facturado" name="Facturado" stroke="#0f172a" strokeWidth={2} fill="url(#gradFact)" />
                        <Area type="monotone" dataKey="cobrado"   name="Cobrado"   stroke="#10b981" strokeWidth={2} fill="url(#gradCob)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Facturado vs Compras vs Margen */}
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Facturado vs Compras a distribuidoras — {year}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.financial.marginByMonth} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                          formatter={(v: any) => [`$${formatCurrency(v)}`, ""]} />
                        <Legend wrapperStyle={{ fontSize: 13 }} />
                        <Bar dataKey="facturado" name="Facturado"   fill="#0f172a" radius={[4,4,0,0]} />
                        <Bar dataKey="compras"   name="Compras"     fill="#fca5a5" radius={[4,4,0,0]} />
                        <Bar dataKey="margen"    name="Margen est." fill="#6ee7b7" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenue by type table */}
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Facturación por tipo — {year}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-slate-500">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">Tipo</th>
                            <th className="px-4 py-2.5 font-medium text-right">Trámites</th>
                            <th className="px-4 py-2.5 font-medium text-right">Facturado</th>
                            <th className="px-4 py-2.5 font-medium text-right">Cobrado</th>
                            <th className="px-4 py-2.5 font-medium text-right">Pendiente</th>
                            <th className="px-4 py-2.5 font-medium text-right">% cobrado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.financial.revenueByTypeArr.map((row) => (
                            <tr key={row.name} className="border-t border-slate-100">
                              <td className="px-4 py-2.5 font-medium text-slate-700">{row.name}</td>
                              <td className="px-4 py-2.5 text-right text-slate-700">{row.count}</td>
                              <td className="px-4 py-2.5 text-right text-slate-900">${formatCurrency(row.revenue)}</td>
                              <td className="px-4 py-2.5 text-right text-emerald-700">${formatCurrency(row.collected)}</td>
                              <td className={`px-4 py-2.5 text-right ${row.pending > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                {row.pending > 0 ? `$${formatCurrency(row.pending)}` : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-600">
                                {row.revenue > 0 ? `${Math.round((row.collected / row.revenue) * 100)}%` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Distributor balances */}
                <Card className="rounded-2xl border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Saldo por distribuidora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-slate-500">
                          <tr>
                            <th className="px-4 py-2.5 font-medium">Distribuidora</th>
                            <th className="px-4 py-2.5 font-medium text-right">Compras {year}</th>
                            <th className="px-4 py-2.5 font-medium text-right">Saldo actual</th>
                            <th className="px-4 py-2.5 font-medium text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.financial.distBalances.map((d) => (
                            <tr key={d.id} className="border-t border-slate-100">
                              <td className="px-4 py-2.5 font-medium text-slate-700">{d.name}</td>
                              <td className="px-4 py-2.5 text-right text-slate-700">
                                {d.purchasesThisYear > 0 ? `$${formatCurrency(d.purchasesThisYear)}` : "—"}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${d.balance > 0 ? "text-rose-600" : d.balance < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                                {d.balance === 0 ? "—" : `$${formatCurrency(Math.abs(d.balance))}`}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                  d.balance > 0 ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : d.balance < 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                                }`}>
                                  {d.balance > 0 ? "Debe" : d.balance < 0 ? "A favor" : "Saldado"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {!loading && !data && (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="py-10 text-center text-slate-500">
              No hay datos disponibles para {year}.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
