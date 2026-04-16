"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, Award, AlertTriangle } from "lucide-react";
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
  monthlyComparison: {
    month: string;
    [key: string]: number | string;
  }[];
  byType: { name: string; value: number }[];
  bestMonth: { name: string; count: number; idx: number } | null;
  worstMonth: { name: string; count: number; idx: number } | null;
  weekly: { week: string; count: number }[];
  weeklyComparison: { week: string; current: number; prev: number }[];
  currentMonthName: string;
  prevMonthName: string;
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

  const growthPct = data?.summary.growthPct;
  const growthTrend =
    growthPct === null ? "neutral" : growthPct > 0 ? "up" : growthPct < 0 ? "down" : "neutral";

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Reportes"
      subtitle="Estadísticas y comparativas de trámites."
    >
      <div className="space-y-6">
        {/* Year selector */}
        <div className="flex items-center gap-3">
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
