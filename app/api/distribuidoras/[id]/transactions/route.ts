import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const VALID_TYPES = ["PURCHASE", "PAYMENT"] as const;
const VALID_PAYMENT_METHODS = ["CASH", "TRANSFER"] as const;

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

function isFutureDate(value: string) {
  const now = new Date();
  const date = new Date(value);
  return date.getTime() > now.getTime();
}

export async function GET(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const { params } = context ?? {};
    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? "1") || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("pageSize") ?? "20") || 20, 1),
      200,
    );
    const typeFilter = (searchParams.get("type") ?? "").trim();
    const dateFrom = (searchParams.get("dateFrom") ?? "").trim();
    const dateTo = (searchParams.get("dateTo") ?? "").trim();
    const query = (searchParams.get("q") ?? "").trim();

    let queryBuilder = supabase
      .from("distributor_transactions")
      .select(
        "id, distributor_id, type, description, amount, payment_method, quantity, unit_price, transaction_date, notes",
        { count: "exact" },
      )
      .eq("distributor_id", params?.id)
      .order("transaction_date", { ascending: true });

    if (typeFilter) {
      queryBuilder = queryBuilder.eq("type", typeFilter);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte("transaction_date", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte("transaction_date", `${dateTo}T23:59:59`);
    }

    if (query) {
      queryBuilder = queryBuilder.ilike("description", `%${query}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) {
      console.error("GET /api/distribuidoras/[id]/transactions error:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar transacciones." },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as TransactionRow[];
    let running = 0;
    const withBalance = rows.map((row) => {
      const amount = Number(row.amount ?? 0);
      running = row.type === "PURCHASE" ? running + amount : running - amount;
      return {
        id: row.id,
        distributorId: row.distributor_id,
        type: row.type,
        description: row.description,
        amount: row.amount ?? 0,
        paymentMethod: row.payment_method,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        transactionDate: row.transaction_date,
        notes: row.notes,
        runningBalance: running,
      };
    });

    const sortedDesc = [...withBalance].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
    );

    const from = (page - 1) * pageSize;
    const paged = sortedDesc.slice(from, from + pageSize);

    return NextResponse.json({
      data: paged,
      pagination: {
        page,
        pageSize,
        total: sortedDesc.length,
        totalPages: Math.max(Math.ceil(sortedDesc.length / pageSize), 1),
      },
      totals: {
        debe: rows
          .filter((row) => row.type === "PURCHASE")
          .reduce((acc, row) => acc + Number(row.amount ?? 0), 0),
        haber: rows
          .filter((row) => row.type === "PAYMENT")
          .reduce((acc, row) => acc + Number(row.amount ?? 0), 0),
        balance: running,
      },
    });
  } catch (error) {
    console.error("GET /api/distribuidoras/[id]/transactions error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar transacciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: any) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { params } = context ?? {};

    const type = String(body.type ?? "").toUpperCase();
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: "Tipo invalido." }, { status: 400 });
    }

    const transactionDate = String(body.transactionDate ?? "").trim();
    if (!transactionDate || isFutureDate(transactionDate)) {
      return NextResponse.json({ error: "Fecha invalida." }, { status: 400 });
    }

    if (type === "PURCHASE") {
      const quantity = Number(body.quantity ?? 0);
      const unitPrice = Number(body.unitPrice ?? 0);
      if (Number.isNaN(quantity) || Number.isNaN(unitPrice) || quantity <= 0 || unitPrice <= 0) {
        return NextResponse.json({ error: "Cantidad o precio invalido." }, { status: 400 });
      }
      const amount = Number((quantity * unitPrice).toFixed(2));
      const description = String(body.description ?? "").trim();
      if (!description) {
        return NextResponse.json({ error: "Descripcion requerida." }, { status: 400 });
      }

      const { error } = await supabase.from("distributor_transactions").insert({
        distributor_id: params?.id,
        type: "PURCHASE",
        description: description.toUpperCase(),
        amount,
        payment_method: null,
        quantity,
        unit_price: unitPrice,
        transaction_date: transactionDate,
        notes: body.notes ? String(body.notes).trim().toUpperCase() : null,
      });

      if (error) {
        console.error("POST /api/distribuidoras/[id]/transactions error:", error);
        return NextResponse.json(
          { error: "No se pudo registrar la compra." },
          { status: 500 },
        );
      }
    } else {
      const amount = Number(body.amount ?? 0);
      const paymentMethod = String(body.paymentMethod ?? "").toUpperCase();
      if (Number.isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: "Monto invalido." }, { status: 400 });
      }
      if (!VALID_PAYMENT_METHODS.includes(paymentMethod as (typeof VALID_PAYMENT_METHODS)[number])) {
        return NextResponse.json({ error: "Metodo de pago invalido." }, { status: 400 });
      }

      const description = String(body.description ?? "").trim();
      if (!description) {
        return NextResponse.json({ error: "Descripcion requerida." }, { status: 400 });
      }

      const { error } = await supabase.from("distributor_transactions").insert({
        distributor_id: params?.id,
        type: "PAYMENT",
        description: description.toUpperCase(),
        amount,
        payment_method: paymentMethod,
        quantity: null,
        unit_price: null,
        transaction_date: transactionDate,
        notes: body.notes ? String(body.notes).trim().toUpperCase() : null,
      });

      if (error) {
        console.error("POST /api/distribuidoras/[id]/transactions error:", error);
        return NextResponse.json(
          { error: "No se pudo registrar el pago." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error("POST /api/distribuidoras/[id]/transactions error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la transaccion." },
      { status: 500 },
    );
  }
}
