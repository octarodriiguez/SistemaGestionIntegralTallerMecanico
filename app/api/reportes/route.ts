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

    // --- Per-month detail (for month focus panel) ---
    // For each month: weekly breakdown + by type + vs prev year same month
    const monthDetails = MONTHS.map((name, mIdx) => {
      const mCurrent = current.filter((p) => new Date(p.created_at).getMonth() === mIdx);
      const mPrev    = prev.filter((p) => new Date(p.created_at).getMonth() === mIdx);

      // Weekly with day ranges
      const weeks = [1,2,3,4,5].map((w) => {
        const dayFrom = (w - 1) * 7 + 1;
        const dayTo   = Math.min(w * 7, 31);
        const wCurrent = mCurrent.filter((p) => {
          const d = new Date(p.created_at).getDate();
          return Math.min(Math.ceil(d / 7), 5) === w;
        }).length;
        const wPrev = mPrev.filter((p) => {
          const d = new Date(p.created_at).getDate();
          return Math.min(Math.ceil(d / 7), 5) === w;
        }).length;
        return { week: `Sem ${w}`, label: `Sem ${w} (${dayFrom}–${dayTo})`, dayFrom, dayTo, current: wCurrent, prev: wPrev };
      });

      // Daily evolution for this month (current year)
      const daysInMonth = new Date(yearParam, mIdx + 1, 0).getDate();
      const dailyCurrent: number[] = Array(daysInMonth + 1).fill(0);
      const dailyPrev:    number[] = Array(daysInMonth + 1).fill(0);
      for (const p of mCurrent) {
        const d = new Date(p.created_at).getDate();
        if (d >= 1 && d <= daysInMonth) dailyCurrent[d]++;
      }
      for (const p of mPrev) {
        const d = new Date(p.created_at).getDate();
        if (d >= 1 && d <= daysInMonth) dailyPrev[d]++;
      }
      const dailyEvolution = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        [String(yearParam)]: dailyCurrent[i + 1],
        [String(compareYear)]: dailyPrev[i + 1],
      }));

      // By type with prev year
      const byTypeCurrent: Record<string, number> = {};
      const byTypePrev:    Record<string, number> = {};
      for (const p of mCurrent) {
        const label = typeLabel(p.procedure_type_id);
        byTypeCurrent[label] = (byTypeCurrent[label] ?? 0) + 1;
      }
      for (const p of mPrev) {
        const label = typeLabel(p.procedure_type_id);
        byTypePrev[label] = (byTypePrev[label] ?? 0) + 1;
      }
      const allTypeNames = Array.from(new Set([...Object.keys(byTypeCurrent), ...Object.keys(byTypePrev)]));
      const byTypeMonth = allTypeNames
        .map((n) => ({ name: n, value: byTypeCurrent[n] ?? 0, valuePrev: byTypePrev[n] ?? 0 }))
        .sort((a, b) => b.value - a.value);

      const revenueCurrent = mCurrent.reduce((a, p) => a + Number(p.total_amount ?? 0), 0);
      const collectedCurrent = mCurrent.reduce((a, p) => a + Number(p.amount_paid ?? 0), 0);
      const revenuePrev = mPrev.reduce((a, p) => a + Number(p.total_amount ?? 0), 0);

      return {
        monthIdx: mIdx,
        monthName: name,
        totalCurrent: mCurrent.length,
        totalPrev: mPrev.length,
        revenueCurrent,
        collectedCurrent,
        revenuePrev,
        weeks,
        byType: byTypeMonth,
        dailyEvolution,
      };
    });

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
      label: `Sem ${w} (${(Number(w)-1)*7+1}–${Math.min(Number(w)*7,31)})`,
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
      label: `Sem ${w} (${(Number(w)-1)*7+1}–${Math.min(Number(w)*7,31)})`,
      current: count,
      prev: weeklyPrevMap[Number(w)] ?? 0,
    }));

    // --- Summary stats ---
    const totalCurrent = current.length;
    const totalPrev = prev.length;
    const revenueCurrent = current.reduce((acc, p) => acc + Number(p.total_amount ?? 0), 0);
    const revenuePrev = prev.reduce((acc, p) => acc + Number(p.total_amount ?? 0), 0);
    const collectedCurrent = current.reduce((acc, p) => acc + Number(p.amount_paid ?? 0), 0);
    const pendingCurrent = Math.max(revenueCurrent - collectedCurrent, 0);

    // --- Financial: monthly cobrado/pendiente ---
    const byMonthFinancial = MONTHS.map((name, i) => ({
      month: name,
      facturado: byMonth[i].revenue,
      facturadoPrev: byMonthPrev[i].revenue,
      cobrado: 0,
      pendiente: 0,
    }));
    for (const p of current) {
      const m = new Date(p.created_at).getMonth();
      byMonthFinancial[m].cobrado   += Number(p.amount_paid ?? 0);
      byMonthFinancial[m].pendiente += Math.max(Number(p.total_amount ?? 0) - Number(p.amount_paid ?? 0), 0);
    }

    // --- Financial: revenue by type ---
    const revenueByType: Record<string, { count: number; revenue: number; collected: number }> = {};
    for (const p of current) {
      const label = typeLabel(p.procedure_type_id);
      if (!revenueByType[label]) revenueByType[label] = { count: 0, revenue: 0, collected: 0 };
      revenueByType[label].count++;
      revenueByType[label].revenue   += Number(p.total_amount ?? 0);
      revenueByType[label].collected += Number(p.amount_paid ?? 0);
    }
    const revenueByTypeArr = Object.entries(revenueByType)
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue, collected: v.collected, pending: v.revenue - v.collected }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Financial: distributor balances ---
    const [distributorsResult, txResult] = await Promise.all([
      supabase.from("distributors").select("id, name"),
      supabase.from("distributor_transactions").select("id, distributor_id, type, amount, transaction_date"),
    ]);
    const distributors = distributorsResult.data ?? [];
    const allTx        = txResult.data ?? [];

    const distBalances = distributors.map((d: any) => {
      const txs     = allTx.filter((t: any) => t.distributor_id === d.id);
      const balance = txs.reduce((acc: number, t: any) =>
        t.type === "PURCHASE" ? acc + Number(t.amount ?? 0) : acc - Number(t.amount ?? 0), 0);
      const purchasesThisYear = txs
        .filter((t: any) => t.type === "PURCHASE" && new Date(t.transaction_date).getFullYear() === yearParam)
        .reduce((acc: number, t: any) => acc + Number(t.amount ?? 0), 0);
      return { id: d.id, name: d.name, balance, purchasesThisYear };
    }).sort((a: any, b: any) => b.balance - a.balance);

    const totalDistDebt   = distBalances.filter((d: any) => d.balance > 0).reduce((a: number, d: any) => a + d.balance, 0);
    const totalDistCredit = distBalances.filter((d: any) => d.balance < 0).reduce((a: number, d: any) => a + Math.abs(d.balance), 0);

    // --- Financial: margin by month ---
    const purchasesByMonth = MONTHS.map(() => 0);
    for (const t of allTx) {
      if (t.type !== "PURCHASE") continue;
      const d = new Date(t.transaction_date);
      if (d.getFullYear() !== yearParam) continue;
      purchasesByMonth[d.getMonth()] += Number(t.amount ?? 0);
    }
    const marginByMonth = MONTHS.map((name, i) => ({
      month:     name,
      facturado: byMonth[i].revenue,
      compras:   purchasesByMonth[i],
      margen:    byMonth[i].revenue - purchasesByMonth[i],
    }));

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
        monthDetails,
        // Financial
        financial: {
          summary: {
            revenueCurrent,
            collectedCurrent,
            pendingCurrent,
            revenuePrev,
            revenueGrowthPct: revenuePrev > 0 ? Math.round(((revenueCurrent - revenuePrev) / revenuePrev) * 100) : null,
            totalDistDebt,
            totalDistCredit,
          },
          byMonthFinancial,
          revenueByTypeArr,
          distBalances,
          marginByMonth,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/reportes error:", error);
    return NextResponse.json({ error: "No se pudieron cargar los reportes." }, { status: 500 });
  }
}
