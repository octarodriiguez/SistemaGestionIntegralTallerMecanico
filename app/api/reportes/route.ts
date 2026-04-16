import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const yearParam = Number(searchParams.get("year") ?? new Date().getFullYear());
    const compareYear = yearParam - 1;

    // Fetch all procedures for current year and previous year
    const startCurrent = `${yearParam}-01-01T00:00:00.000Z`;
    const endCurrent = `${yearParam}-12-31T23:59:59.999Z`;
    const startPrev = `${compareYear}-01-01T00:00:00.000Z`;
    const endPrev = `${compareYear}-12-31T23:59:59.999Z`;

    const [currentResult, prevResult, typesResult] = await Promise.all([
      supabase
        .from("client_procedures")
        .select("id, created_at, procedure_type_id, total_amount, amount_paid, paid")
        .gte("created_at", startCurrent)
        .lte("created_at", endCurrent)
        .order("created_at", { ascending: true }),
      supabase
        .from("client_procedures")
        .select("id, created_at, procedure_type_id, total_amount")
        .gte("created_at", startPrev)
        .lte("created_at", endPrev)
        .order("created_at", { ascending: true }),
      supabase
        .from("procedure_types")
        .select("id, code, display_name"),
    ]);

    const current = currentResult.data ?? [];
    const prev = prevResult.data ?? [];
    const types = typesResult.data ?? [];

    const typeMap = new Map(types.map((t: any) => [t.id, { code: t.code, displayName: t.display_name }]));

    function typeLabel(id: string) {
      const t = typeMap.get(id) as any;
      if (!t) return "Otro";
      if (t.code === "RENOVACION_OBLEA") return "OBLEA";
      if (t.code === "PRUEBA_HIDRAULICA") return "PH";
      return t.displayName ?? "Otro";
    }

    const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    // --- By month (current year) ---
    const byMonth: Record<number, { count: number; revenue: number }> = {};
    for (let m = 0; m < 12; m++) byMonth[m] = { count: 0, revenue: 0 };
    for (const p of current) {
      const m = new Date(p.created_at).getMonth();
      byMonth[m].count++;
      byMonth[m].revenue += Number(p.total_amount ?? 0);
    }

    // --- By month prev year ---
    const byMonthPrev: Record<number, { count: number; revenue: number }> = {};
    for (let m = 0; m < 12; m++) byMonthPrev[m] = { count: 0, revenue: 0 };
    for (const p of prev) {
      const m = new Date(p.created_at).getMonth();
      byMonthPrev[m].count++;
      byMonthPrev[m].revenue += Number(p.total_amount ?? 0);
    }

    const monthlyComparison = MONTHS.map((name, i) => ({
      month: name,
      [String(yearParam)]: byMonth[i].count,
      [String(compareYear)]: byMonthPrev[i].count,
      revenue: byMonth[i].revenue,
      revenuePrev: byMonthPrev[i].revenue,
    }));

    // --- By type (current year) ---
    const byType: Record<string, number> = {};
    for (const p of current) {
      const label = typeLabel(p.procedure_type_id);
      byType[label] = (byType[label] ?? 0) + 1;
    }
    const byTypeArr = Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // --- Best and worst month ---
    const monthCounts = MONTHS.map((name, i) => ({ name, count: byMonth[i].count, idx: i }));
    const nonZero = monthCounts.filter((m) => m.count > 0);
    const bestMonth = nonZero.length ? nonZero.reduce((a, b) => (a.count >= b.count ? a : b)) : null;
    const worstMonth = nonZero.length ? nonZero.reduce((a, b) => (a.count <= b.count ? a : b)) : null;

    // --- Weekly breakdown for current month ---
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentMonthProcedures = current.filter(
      (p) => new Date(p.created_at).getMonth() === currentMonth,
    );
    const weeklyMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const p of currentMonthProcedures) {
      const day = new Date(p.created_at).getDate();
      const week = Math.min(Math.ceil(day / 7), 5);
      weeklyMap[week]++;
    }
    const weekly = Object.entries(weeklyMap).map(([w, count]) => ({
      week: `Sem ${w}`,
      count,
    }));

    // --- Weekly prev month ---
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? yearParam - 1 : yearParam;
    const prevMonthProcedures = (prevMonthYear === yearParam ? current : prev).filter(
      (p) => new Date(p.created_at).getMonth() === prevMonthIdx,
    );
    const weeklyPrevMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const p of prevMonthProcedures) {
      const day = new Date(p.created_at).getDate();
      const week = Math.min(Math.ceil(day / 7), 5);
      weeklyPrevMap[week]++;
    }
    const weeklyComparison = Object.entries(weeklyMap).map(([w, count]) => ({
      week: `Sem ${w}`,
      current: count,
      prev: weeklyPrevMap[Number(w)] ?? 0,
    }));

    // --- Summary stats ---
    const totalCurrent = current.length;
    const totalPrev = prev.length;
    const revenueCurrent = current.reduce((acc, p) => acc + Number(p.total_amount ?? 0), 0);
    const revenuePrev = prev.reduce((acc, p) => acc + Number(p.total_amount ?? 0), 0);

    return NextResponse.json({
      data: {
        year: yearParam,
        compareYear,
        summary: {
          totalCurrent,
          totalPrev,
          revenueCurrent,
          revenuePrev,
          growthPct: totalPrev > 0 ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 100) : null,
        },
        monthlyComparison,
        byType: byTypeArr,
        bestMonth,
        worstMonth,
        weekly,
        weeklyComparison,
        currentMonthName: MONTHS[currentMonth],
        prevMonthName: MONTHS[prevMonthIdx],
      },
    });
  } catch (error) {
    console.error("GET /api/reportes error:", error);
    return NextResponse.json({ error: "No se pudieron cargar los reportes." }, { status: 500 });
  }
}
