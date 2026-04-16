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
  weekly: { week: string; label: string; count: number }[];
  weeklyComparison: { week: string; label: string; current: number; prev: number }[];
  currentMonthName: string;
  prevMonthName: string;
  monthDetails: {
    monthIdx: number; monthName: string;
    totalCurrent: number; totalPrev: number;
    revenueCurrent: number; collectedCurrent: number; revenuePrev: number;
    weeks: { week: string; label: string; dayFrom: number; dayTo: number; current: number; prev: number }[];
    byType: { name: string; value: number; valuePrev: number }[];
    dailyEvolution: { day: number; [key: string]: number }[];
  }[];
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
const AVAILABLE_YEARS = [currentYear, currentYear - 1, currentYear - 2];
const YEAR_COLORS: Record<number, string> = {
  [currentYear]:     "#0f172a",
  [currentYear - 1]: "#3b82f6",
  [currentYear - 2]: "#10b981",
};

export default function ReportesPage() {
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"operativo" | "financiero">("operativo");
  const [focusMonth, setFocusMonth] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Primary year = most recent selected
  const primaryYear = Math.max(...selectedYears);

  async function fetchReport(years: number[]) {
    if (years.length === 0) return;
    setLoading(true);
    try {
      // Always fetch primary year; compareYear is always primaryYear - 1
      const res = await fetch(`/api/reportes?year=${primaryYear}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport(selectedYears);
    setFocusMonth(null);
    setTypeFilter(null);
  }, [selectedYears.join(",")]);

  function toggleYear(y: number) {
    setSelectedYears((prev) =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter((x) => x !== y) : prev
        : [...prev, y].sort((a, b) => b - a),
    );
  }

  const year = primaryYear;
  const growthPct = data?.summary?.growthPct ?? null;
  const growthTrend = growthPct === null ? "neutral" : growthPct > 0 ? "up" : growthPct < 0 ? "down" : "neutral";

  // All procedure types available in data
  const allTypes = data ? Array.from(new Set(data.byType.map((t) => t.name))) : [];

  const focusMonthData = focusMonth !== null ? data?.monthDetails?.[focusMonth] : null;
  const filteredFocusByType = focusMonthData?.byType.filter((t) => !typeFilter || t.name === typeFilter) ?? [];

  // Pie data: if month focused, use that month's type breakdown; otherwise full year
  const pieData = focusMonthData
    ? focusMonthData.byType.map((t) => ({ name: t.name, value: t.value }))
    : (data?.byType ?? []);

  // Monthly comparison: highlight focused month
  const monthlyData = data?.monthlyComparison.map((row, i) => ({
    ...row,
    _focused: focusMonth === i,
  })) ?? [];

  // Current month daily evolution (for the bottom chart)
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const dailyEvolutionData = data?.monthDetails?.[focusMonth ?? currentMonthIdx]?.dailyEvolution ?? [];

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Reportes"
      subtitle="Estadísticas y comparativas de trámites."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-start gap-3">
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

          {/* Year selector */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Años</span>
            <div className="flex gap-1.5">
              {AVAILABLE_YEARS.map((y) => {
                const active = selectedYears.includes(y);
                return (
                  <button key={y} type="button" onClick={() => toggleYear(y)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition ${
                      active ? "text-white border-transparent" : "border-slate-200 text-slate-600 bg-white hover:border-slate-400"
                    }`}
                    style={active ? { background: YEAR_COLORS[y] } : {}}>
                    {y}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          {allTypes.length > 1 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setTypeFilter(null)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition ${
                    !typeFilter ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 bg-white hover:border-slate-400"
                  }`}>
                  Todos
                </button>
                {allTypes.map((t) => (
                  <button key={t} type="button" onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium border transition ${
                      typeFilter === t ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 bg-white hover:border-slate-400"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <span className="text-sm text-slate-400 self-end pb-1">Cargando...</span>}
        </div>

        {/* Active filter pills */}
        {(focusMonth !== null || typeFilter !== null) && data && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtros activos:</span>
            {focusMonth !== null && (
              <button type="button" onClick={() => setFocusMonth(null)}
                className="flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs px-3 py-1 hover:bg-slate-700">
                {data.monthDetails[focusMonth].monthName} {year}
                <span className="opacity-60">✕</span>
              </button>
            )}
            {typeFilter !== null && (
              <button type="button" onClick={() => setTypeFilter(null)}
                className="flex items-center gap-1.5 rounded-full bg-slate-600 text-white text-xs px-3 py-1 hover:bg-slate-500">
                {typeFilter}
                <span className="opacity-60">✕</span>
              </button>
            )}
            <button type="button" onClick={() => { setFocusMonth(null); setTypeFilter(null); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2">
              Limpiar todo
            </button>
          </div>
        )}

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
                  Trámites por mes — {selectedYears.join(", ")}
                  <span className="ml-2 text-sm font-normal text-slate-400">Click en un mes para ver detalle</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={monthlyData}
                    barGap={4}
                    onClick={(e) => {
                      const idx = typeof e?.activeTooltipIndex === "number" ? e.activeTooltipIndex : null;
                      if (idx !== null) setFocusMonth((prev) => prev === idx ? null : idx);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    {selectedYears.map((y) => (
                      <Bar key={y} dataKey={String(y)} radius={[4,4,0,0]}>
                        {monthlyData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry._focused
                              ? (YEAR_COLORS[y] ?? "#0f172a")
                              : focusMonth !== null
                                ? `${YEAR_COLORS[y] ?? "#0f172a"}55`
                                : (YEAR_COLORS[y] ?? "#0f172a")}
                          />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Month focus panel */}
            {focusMonth !== null && focusMonthData && (() => {
              const md = focusMonthData;
              const totalCurrent = typeFilter
                ? (filteredFocusByType.find((t) => t.name === typeFilter)?.value ?? 0)
                : md.totalCurrent;
              const totalPrev = typeFilter
                ? (filteredFocusByType.find((t) => t.name === typeFilter)?.valuePrev ?? 0)
                : md.totalPrev;
              const delta = totalCurrent - totalPrev;
              return (
                <Card className="rounded-2xl border-slate-900 bg-slate-900 text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl text-white">
                        {md.monthName} {year}{typeFilter ? ` — ${typeFilter}` : ""} vs {data.compareYear}
                      </CardTitle>
                      <button type="button" onClick={() => setFocusMonth(null)}
                        className="text-slate-400 hover:text-white text-sm">x cerrar</button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: `Tramites ${year}`, value: totalCurrent },
                        { label: `Tramites ${data.compareYear}`, value: totalPrev },
                        { label: "Variacion", value: delta === 0 ? "-" : `${delta > 0 ? "+" : ""}${delta}`, color: delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-400" },
                        { label: `Facturado ${year}`, value: `$${formatCurrency(md.revenueCurrent)}` },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-slate-800 p-3">
                          <p className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</p>
                          <p className={`text-2xl font-bold mt-1 ${"color" in item ? item.color : "text-white"}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300 mb-2">Evolucion diaria</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={md.dailyEvolution} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #334155", background: "#1e293b", fontSize: 12, color: "#f1f5f9" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey={String(year)} fill={YEAR_COLORS[year] ?? "#0f172a"} radius={[2,2,0,0]} />
                          <Bar dataKey={String(data.compareYear)} fill="#475569" radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-300 mb-2">Semanas</p>
                      <div className="rounded-xl overflow-hidden border border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-800 text-slate-400">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Semana</th>
                              <th className="px-4 py-2 text-right font-medium">{year}</th>
                              <th className="px-4 py-2 text-right font-medium">{data.compareYear}</th>
                              <th className="px-4 py-2 text-right font-medium">D</th>
                            </tr>
                          </thead>
                          <tbody>
                            {md.weeks.map((w) => {
                              const d = w.current - w.prev;
                              return (
                                <tr key={w.week} className="border-t border-slate-700">
                                  <td className="px-4 py-2 text-slate-200">
                                    {w.week}
                                    <span className="ml-2 text-xs text-slate-500">({w.dayFrom}-{w.dayTo})</span>
                                  </td>
                                  <td className="px-4 py-2 text-right font-semibold text-white">{w.current}</td>
                                  <td className="px-4 py-2 text-right text-slate-400">{w.prev}</td>
                                  <td className={`px-4 py-2 text-right font-semibold ${d > 0 ? "text-emerald-400" : d < 0 ? "text-rose-400" : "text-slate-500"}`}>
                                    {d > 0 ? `+${d}` : d === 0 ? "-" : d}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {md.byType.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-300 mb-2">Por tipo (click para filtrar)</p>
                        <div className="flex flex-wrap gap-2">
                          {md.byType.map((item) => (
                            <div key={item.name}
                              onClick={() => setTypeFilter(typeFilter === item.name ? null : item.name)}
                              className={`rounded-xl px-4 py-2 flex items-center gap-3 cursor-pointer transition ${
                                typeFilter === item.name ? "bg-white/20 ring-1 ring-white/40" : "bg-slate-800 hover:bg-slate-700"
                              }`}>
                              <span className="text-slate-300 text-sm">{item.name}</span>
                              <span className="text-white font-bold text-lg">{item.value}</span>
                              <span className="text-slate-400 text-sm">vs {item.valuePrev}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
            {/* By type + weekly side by side */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* By type pie */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">
                    Por tipo{focusMonth !== null ? ` — ${data.monthDetails[focusMonth].monthName}` : ` — ${year}`}
                    <span className="ml-2 text-sm font-normal text-slate-400">Click para filtrar</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          style={{ cursor: "pointer" }}
                          onClick={(entry) => {
                            const name = entry?.name as string | undefined;
                            if (name) setTypeFilter((prev) => prev === name ? null : name);
                          }}
                        >
                          {pieData.map((item, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              opacity={typeFilter && typeFilter !== item.name ? 0.3 : 1}
                              stroke={typeFilter === item.name ? "#fff" : "none"}
                              strokeWidth={typeFilter === item.name ? 2 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 min-w-[100px]">
                      {pieData.map((item, i) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setTypeFilter((prev) => prev === item.name ? null : item.name)}
                          className={`flex w-full items-center gap-2 text-sm rounded-lg px-2 py-1 transition ${
                            typeFilter === item.name ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length], opacity: typeFilter && typeFilter !== item.name ? 0.3 : 1 }} />
                          <span className="text-slate-700">{item.name}</span>
                          <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly comparison: focused month vs same month prev year */}
              <Card className="rounded-2xl border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">
                    {focusMonth !== null
                      ? `Semanas — ${data.monthDetails[focusMonth].monthName} ${year} vs ${data.compareYear}`
                      : `Semanas — ${data.currentMonthName} ${year} vs ${data.compareYear}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={(focusMonth !== null ? data.monthDetails[focusMonth] : data.monthDetails[new Date().getMonth()]).weeks}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 13 }} />
                      <Bar dataKey="current" name={String(year)} fill="#0f172a" radius={[4,4,0,0]} />
                      <Bar dataKey="prev" name={String(data.compareYear)} fill="#64748b" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Daily evolution — line chart connecting days */}
            <Card className="rounded-2xl border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">
                  Evolucion diaria — {focusMonth !== null ? data.monthDetails[focusMonth].monthName : data.currentMonthName} {year} vs {data.compareYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyEvolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey={String(year)} stroke={YEAR_COLORS[year] ?? "#0f172a"} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey={String(data.compareYear)} stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
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
