import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DistributorRow = {
  id: string;
  name: string;
  phone: string | null;
};

type TransactionRow = {
  id: string;
  distributor_id: string;
  type: "PURCHASE" | "PAYMENT" | string;
  description: string | null;
  amount: number | null;
  payment_method: string | null;
  quantity: number | null;
  unit_price: number | null;
  transaction_date: string;
  notes: string | null;
};

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    const { data: distributors, error } = await supabase
      .from("distributors")
      .select("id, name, phone")
      .order("name", { ascending: true });

    if (error) {
      console.error("GET /api/distribuidoras error:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar las distribuidoras." },
        { status: 500 },
      );
    }

    const distributorList = (distributors ?? []) as DistributorRow[];
    if (distributorList.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const distributorIds = distributorList.map((item) => item.id);

    const { data: transactions, error: txError } = await supabase
      .from("distributor_transactions")
      .select(
        "id, distributor_id, type, description, amount, payment_method, quantity, unit_price, transaction_date, notes",
      )
      .in("distributor_id", distributorIds)
      .order("transaction_date", { ascending: false });

    if (txError) {
      console.error("GET /api/distribuidoras transactions error:", txError);
      return NextResponse.json(
        { error: "No se pudieron cargar las transacciones." },
        { status: 500 },
      );
    }

    const transactionsByDistributor = new Map<string, TransactionRow[]>();
    (transactions ?? []).forEach((row) => {
      const list = transactionsByDistributor.get(row.distributor_id) ?? [];
      list.push(row as TransactionRow);
      transactionsByDistributor.set(row.distributor_id, list);
    });

    const response = distributorList.map((item) => {
      const txList = transactionsByDistributor.get(item.id) ?? [];
      const balance = txList.reduce((acc, tx) => {
        const amount = Number(tx.amount ?? 0);
        return tx.type === "PURCHASE" ? acc + amount : acc - amount;
      }, 0);
      const lastTxDate = txList.length > 0 ? txList[0].transaction_date : null;
      return {
        ...item,
        balance,
        lastTransactions: txList.slice(0, 3),
        lastTxDate,
      };
    });

    // Sort: distributors with recent transactions first
    response.sort((a, b) => {
      if (!a.lastTxDate && !b.lastTxDate) return a.name.localeCompare(b.name);
      if (!a.lastTxDate) return 1;
      if (!b.lastTxDate) return -1;
      return new Date(b.lastTxDate).getTime() - new Date(a.lastTxDate).getTime();
    });

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("GET /api/distribuidoras error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las distribuidoras." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido." }, { status: 400 });
    }

    const normalizedName = name.toUpperCase();
    const { data: existing } = await supabase
      .from("distributors")
      .select("id")
      .eq("name", normalizedName);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "La distribuidora ya existe." }, { status: 409 });
    }

    const payload = {
      name: normalizedName,
      phone: body.phone ? String(body.phone).trim() : null,
    };

    const { data, error } = await supabase
      .from("distributors")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/distribuidoras error:", error);
      return NextResponse.json(
        { error: "No se pudo crear la distribuidora." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("POST /api/distribuidoras error:", error);
    return NextResponse.json(
      { error: "No se pudo crear la distribuidora." },
      { status: 500 },
    );
  }
}
