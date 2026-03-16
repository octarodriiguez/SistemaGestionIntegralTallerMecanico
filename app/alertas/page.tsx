"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  PackageCheck,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AlertRow = {
  id: string;
  createdAt: string;
  notes?: string | null;
  status: "PENDIENTE_DE_AVISAR" | "AVISADO" | "NO_CORRESPONDE_AVISAR" | string;
  enargasLastOperationDate: string | null;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  vehicle: {
    brand: string;
    model: string;
    domain: string;
  } | null;
  procedureType: {
    displayName: string;
    code: string;
  } | null;
};

type DeliveryRow = {
  id: string;
  createdAt: string;
  notes?: string | null;
  status: "PENDIENTE_RECEPCION" | "RECIBIDO" | "AVISADO_RETIRO" | "RETIRADO" | string;
  paid: boolean | null;
  totalAmount: number | null;
  amountPaid: number | null;
  receivedAt: string | null;
  notifiedAt: string | null;
  pickedUpAt: string | null;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  vehicle: {
    brand: string;
    model: string;
    domain: string;
  } | null;
  procedureType: {
    displayName: string;
    code: string;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const pdfStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
  },
  title: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#94a3b8",
    paddingVertical: 4,
    backgroundColor: "#f8fafc",
  },
  cell: {
    flex: 1,
    paddingRight: 4,
  },
});

function currentMonthString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function toWhatsappPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.startsWith("0")) return `549${digits.slice(1)}`;
  return `549${digits}`;
}

function statusLabel(status: string) {
  if (status === "AVISADO") return "AVISADO";
  if (status === "NO_CORRESPONDE_AVISAR") return "NO CORRESPONDE";
  return "PENDIENTE";
}

function statusClass(status: string) {
  if (status === "AVISADO") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "NO_CORRESPONDE_AVISAR") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function deliveryStatusLabel(status: string) {
  if (status === "RECIBIDO") return "RECIBIDO";
  if (status === "AVISADO_RETIRO") return "AVISADO";
  if (status === "RETIRADO") return "RETIRADO";
  return "PENDIENTE";
}

function deliveryStatusClass(status: string) {
  if (status === "RETIRADO") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "AVISADO_RETIRO") return "bg-sky-100 text-sky-700 border-sky-200";
  if (status === "RECIBIDO") return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function procedureLabel(code: string | undefined, displayName: string | undefined) {
  if (code === "RENOVACION_OBLEA") return "OBLEA";
  if (code === "PRUEBA_HIDRAULICA") return "PH";
  return displayName || "-";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const datePart = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-AR");
}

function getMonthNameEsFromDate(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(parsed);
}

function formatAmount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function stripMetaTags(notes: string | null | undefined) {
  if (!notes) return "";
  return notes
    .replace(/\[DOMINIO:[^\]]+\]/gi, "")
    .replace(/\[TEL:[^\]]+\]/gi, "")
    .replace(/\[TUBOS:[^\]]+\]/gi, "")
    .replace(/\[DESC:[^\]]+\]/gi, "")
    .trim();
}

export default function AlertasPage() {
  const [vencimientosOpen, setVencimientosOpen] = useState(false);
  const [retirosOpen, setRetirosOpen] = useState(true);

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [monthFilter, setMonthFilter] = useState(currentMonthString());
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  const [deliveryRows, setDeliveryRows] = useState<DeliveryRow[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"yesterday" | "pending" | "all">("yesterday");
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [deliveryPagination, setDeliveryPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [retireModalOpen, setRetireModalOpen] = useState(false);
  const [retireProcedureId, setRetireProcedureId] = useState("");
  const [retireAmountInput, setRetireAmountInput] = useState("0");

  const activeMonth = useMemo(() => (showAll ? "" : monthFilter), [showAll, monthFilter]);

  async function fetchAlerts({
    query = search,
    page = pagination.page,
    month = activeMonth,
    all = showAll,
    status = statusFilter,
  }: {
    query?: string;
    page?: number;
    month?: string;
    all?: boolean;
    status?: string;
  } = {}) {
    setLoading(true);
    try {
      const searchMode = query.trim().length > 0;
      const effectiveAll = all || searchMode;

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status.trim()) params.set("status", status.trim());
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (effectiveAll) {
        params.set("all", "1");
      } else if (month) {
        params.set("month", month);
      }

      const res = await fetch(`/api/avisos?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar avisos.");

      setRows(json.data ?? []);
      setPagination(
        json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al cargar avisos.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeliveries({
    query = deliverySearch,
    page = deliveryPagination.page,
    filter = deliveryFilter,
  }: {
    query?: string;
    page?: number;
    filter?: "yesterday" | "pending" | "all";
  } = {}) {
    setDeliveryLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("filter", filter);
      params.set("page", String(page));
      params.set("pageSize", String(deliveryPagination.pageSize));

      const res = await fetch(`/api/avisos/retiro?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar retiros.");

      setDeliveryRows(json.data ?? []);
      setDeliveryPagination(
        json.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Error al cargar retiros.");
    } finally {
      setDeliveryLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, monthFilter, statusFilter]);

  useEffect(() => {
    fetchDeliveries({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryFilter]);

  useEffect(() => {
    setSelectedDeliveryIds((current) =>
      current.filter((id) => deliveryRows.some((row) => row.id === id)),
    );
  }, [deliveryRows]);

  async function runCheck() {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/avisos/comprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: search,
          month: activeMonth,
          all: showAll,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo comprobar.");
      toast.success(
        `Comprobacion terminada. Evaluados: ${json.data?.checked ?? 0} | Pendientes: ${json.data?.pending ?? 0}`,
      );
      await fetchAlerts({ page: 1 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al comprobar.");
    } finally {
      setRunningCheck(false);
    }
  }

  async function handleAvisar(row: AlertRow) {
    if (!row.client?.phone) return;
    try {
      const res = await fetch("/api/avisos/avisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      const monthName = getMonthNameEsFromDate(row.createdAt).toUpperCase() || "ESTE MES";
      const domain = (row.vehicle?.domain || "-").toUpperCase();
      const message = `Hola buenas, le hablo del taller de GNC Cosquin para recordarle que en el mes de ${monthName} se le vence la OBLEA del dominio ${domain}.`;

      window.open(
        `https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}&text=${encodeURIComponent(message)}`,
        "_blank",
      );
      await fetchAlerts({ page: pagination.page, query: search });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al avisar.");
    }
  }

  async function handleDeliveryAction(
    row: DeliveryRow,
    action: "received" | "notified" | "retired",
  ) {
    try {
      let amountPaid: number | undefined;
      if (action === "retired") {
        const remaining = Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0);
        setRetireProcedureId(row.id);
        setRetireAmountInput(remaining > 0 ? String(remaining) : "0");
        setRetireModalOpen(true);
        return;
      }

      const res = await fetch("/api/avisos/retiro/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: row.id, action, amountPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      if (action === "notified" && row.client?.phone) {
        const message =
          row.procedureType?.code === "PRUEBA_HIDRAULICA"
            ? "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra listo el tubo para ser colocado"
            : "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra la OBLEA para ser retirada";
        window.open(
          `https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client.phone)}&text=${encodeURIComponent(message)}`,
          "_blank",
        );
      }

      await fetchDeliveries({ page: deliveryPagination.page, query: deliverySearch });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar retiro.");
    }
  }

  async function confirmRetiredFromModal() {
    const amountPaid = Number(String(retireAmountInput ?? "").replace(",", "."));
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error("Monto invalido.");
      return;
    }

    try {
      const res = await fetch("/api/avisos/retiro/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureId: retireProcedureId, action: "retired", amountPaid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      setRetireModalOpen(false);
      setRetireProcedureId("");
      setRetireAmountInput("0");
      toast.success("Tramite marcado como retirado.");
      await fetchDeliveries({ page: deliveryPagination.page, query: deliverySearch });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar retiro.");
    }
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportDeliveriesExcel() {
    const headers = [
      "CLIENTE",
      "TELEFONO",
      "DOMINIO",
      "VEHICULO",
      "TRAMITE",
      "FECHA_ALTA",
      "TOTAL",
      "ABONADO",
      "SALDO",
      "PAGADO",
      "ESTADO",
      "OBSERVACIONES",
    ];

    const csvRows = deliveryRows.map((row) => {
      const values = [
        `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim(),
        row.client?.phone || "",
        row.vehicle?.domain || "",
        row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "",
        procedureLabel(row.procedureType?.code, row.procedureType?.displayName),
        formatDate(row.createdAt),
        String(row.totalAmount ?? ""),
        String(row.amountPaid ?? ""),
        String(Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0)),
        row.paid ? "SI" : "NO",
        deliveryStatusLabel(row.status),
        stripMetaTags(row.notes),
      ];
      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");
    downloadFile(
      "\ufeff" + csv,
      `avisos_retiro_${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8;",
    );
  }

  function exportAlertsExcel() {
    const headers = [
      "CLIENTE",
      "TELEFONO",
      "DOMINIO",
      "VEHICULO",
      "TRAMITE",
      "FECHA_TRAMITE",
      "FECHA_ENARGAS",
      "ESTADO",
    ];

    const csvRows = rows.map((row) => {
      const values = [
        `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim(),
        row.client?.phone || "",
        row.vehicle?.domain || "",
        row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "",
        procedureLabel(row.procedureType?.code, row.procedureType?.displayName),
        formatDate(row.createdAt),
        formatDate(row.enargasLastOperationDate),
        statusLabel(row.status),
      ];
      return values
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...csvRows].join("\n");
    downloadFile(
      "\ufeff" + csv,
      `avisos_vencimientos_${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8;",
    );
  }

  async function exportAlertsPdf() {
    const rowsData = rows.map((row) => [
      `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim() || "-",
      row.client?.phone || "-",
      row.vehicle?.domain || "-",
      row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-",
      procedureLabel(row.procedureType?.code, row.procedureType?.displayName),
      formatDate(row.createdAt),
      formatDate(row.enargasLastOperationDate),
      statusLabel(row.status),
    ]);

    const doc = (
      <Document>
        <Page size="A4" orientation="landscape" style={pdfStyles.page}>
          <Text style={pdfStyles.title}>
            Avisos vencimientos - {new Date().toLocaleDateString("es-AR")}
          </Text>
          <View style={pdfStyles.headerRow}>
            {["Cliente", "Telefono", "Dominio", "Vehiculo", "Tramite", "Fecha tramite", "Fecha ENARGAS", "Estado"].map((h) => (
              <Text key={h} style={pdfStyles.cell}>{h}</Text>
            ))}
          </View>
          {rowsData.map((line, idx) => (
            <View key={`alert-pdf-${idx}`} style={pdfStyles.row}>
              {line.map((cell, cellIdx) => (
                <Text key={`alert-pdf-${idx}-${cellIdx}`} style={pdfStyles.cell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </Page>
      </Document>
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avisos_vencimientos_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printAlertsReport() {
    const htmlRows = rows
      .map((row) => {
        const client = `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim();
        const vehicle = row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-";
        return `<tr>
          <td>${client || "-"}</td>
          <td>${row.client?.phone || "-"}</td>
          <td>${row.vehicle?.domain || "-"}</td>
          <td>${vehicle}</td>
          <td>${procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}</td>
          <td>${formatDate(row.createdAt)}</td>
          <td>${formatDate(row.enargasLastOperationDate)}</td>
          <td>${statusLabel(row.status)}</td>
        </tr>`;
      })
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      toast.error("Habilita ventanas emergentes para imprimir.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Imprimir avisos vencimientos</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #dbe2ea; padding: 6px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Avisos vencimientos - ${new Date().toLocaleDateString("es-AR")}</h1>
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Telefono</th><th>Dominio</th><th>Vehiculo</th>
                <th>Tramite</th><th>Fecha tramite</th><th>Fecha ENARGAS</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function exportDeliveriesPdf() {
    const rowsData = deliveryRows.map((row) => [
      `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim() || "-",
      row.client?.phone || "-",
      row.vehicle?.domain || "-",
      row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-",
      procedureLabel(row.procedureType?.code, row.procedureType?.displayName),
      formatDate(row.createdAt),
      formatAmount(row.totalAmount),
      formatAmount(row.amountPaid),
      formatAmount(Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0)),
      deliveryStatusLabel(row.status),
    ]);

    const doc = (
      <Document>
        <Page size="A4" orientation="landscape" style={pdfStyles.page}>
          <Text style={pdfStyles.title}>
            Avisos retiro - {new Date().toLocaleDateString("es-AR")}
          </Text>
          <View style={pdfStyles.headerRow}>
            {["Cliente", "Telefono", "Dominio", "Vehiculo", "Tramite", "Fecha", "Total", "Abonado", "Saldo", "Estado"].map((h) => (
              <Text key={h} style={pdfStyles.cell}>{h}</Text>
            ))}
          </View>
          {rowsData.map((line, idx) => (
            <View key={`delivery-pdf-${idx}`} style={pdfStyles.row}>
              {line.map((cell, cellIdx) => (
                <Text key={`delivery-pdf-${idx}-${cellIdx}`} style={pdfStyles.cell}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </Page>
      </Document>
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `avisos_retiro_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printDeliveriesReport() {
    const htmlRows = deliveryRows
      .map((row) => {
        const client = `${row.client?.lastName || ""}, ${row.client?.firstName || ""}`.trim();
        const vehicle = row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-";
        const saldo = formatAmount(Math.max((row.totalAmount ?? 0) - (row.amountPaid ?? 0), 0));
        return `<tr>
          <td>${client || "-"}</td>
          <td>${row.client?.phone || "-"}</td>
          <td>${row.vehicle?.domain || "-"}</td>
          <td>${vehicle}</td>
          <td>${procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}</td>
          <td>${formatDate(row.createdAt)}</td>
          <td>${formatAmount(row.totalAmount)}</td>
          <td>${formatAmount(row.amountPaid)}</td>
          <td>${saldo}</td>
          <td>${deliveryStatusLabel(row.status)}</td>
        </tr>`;
      })
      .join("");

    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      toast.error("Habilita ventanas emergentes para imprimir.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Imprimir avisos retiro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #dbe2ea; padding: 6px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Avisos retiro - ${new Date().toLocaleDateString("es-AR")}</h1>
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Telefono</th><th>Dominio</th><th>Vehiculo</th>
                <th>Tramite</th><th>Fecha</th><th>Total</th><th>Abonado</th><th>Saldo</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function toggleDeliverySelection(id: string) {
    setSelectedDeliveryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectAllVisibleDeliveries() {
    const visibleIds = deliveryRows.map((row) => row.id);
    const allSelected = visibleIds.every((id) => selectedDeliveryIds.includes(id));
    if (allSelected) {
      setSelectedDeliveryIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedDeliveryIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function handleBulkDeliveryAction(action: "received" | "notified") {
    if (selectedDeliveryIds.length === 0) {
      toast.error("Selecciona al menos un tramite.");
      return;
    }

    setProcessingBulk(true);
    try {
      const res = await fetch("/api/avisos/retiro/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedureIds: selectedDeliveryIds, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar estado.");

      if (action === "notified") {
        const rowsToNotify = deliveryRows.filter(
          (row) => selectedDeliveryIds.includes(row.id) && row.client?.phone,
        );

        if (rowsToNotify.length > 0) {
          const confirm = await Swal.fire({
            title: "Abrir WhatsApp masivo",
            text: `Se abriran ${rowsToNotify.length} chats para avisar retiro.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Abrir",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#0f172a",
            cancelButtonColor: "#94a3b8",
          });

          if (confirm.isConfirmed) {
            for (const row of rowsToNotify) {
              const message =
                row.procedureType?.code === "PRUEBA_HIDRAULICA"
                  ? "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra listo el tubo para ser colocado"
                  : "Hola buenas, le hablo del taller de GNC Cosquin para informarle que ya se encuentra la OBLEA para ser retirada";
              window.open(
                `https://api.whatsapp.com/send?phone=${toWhatsappPhone(row.client?.phone || "")}&text=${encodeURIComponent(message)}`,
                "_blank",
              );
            }
          }
        }
      }

      toast.success(`Tramites actualizados: ${json.data?.updated ?? selectedDeliveryIds.length}.`);
      setSelectedDeliveryIds([]);
      await fetchDeliveries({ page: deliveryPagination.page, query: deliverySearch });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar masivo.");
    } finally {
      setProcessingBulk(false);
    }
  }

  return (
    <AppShell
      sectionLabel="Modulo"
      title="Avisos"
      subtitle="Control de vencimientos de oblea y prueba hidraulica."
    >
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => setVencimientosOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-left"
                >
                  {vencimientosOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  )}
                  <CardTitle className="text-2xl text-slate-900">Vencimientos</CardTitle>
                </button>
                <Button
                  onClick={runCheck}
                  disabled={runningCheck || !vencimientosOpen}
                  className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  <BellRing className="h-4 w-4" />
                  {runningCheck ? "Comprobando..." : "Comprobar vencimientos"}
                </Button>
              </div>
            </CardHeader>

            {vencimientosOpen ? (
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1fr)_160px_180px_140px_120px]">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
                    <Search className="h-4 w-4" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      placeholder="Buscar persona o dominio"
                    />
                  </div>

                  <input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value);
                      setShowAll(false);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  />

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">Todos los estados</option>
                    <option value="PENDIENTE_DE_AVISAR">Pendiente</option>
                    <option value="AVISADO">Avisado</option>
                    <option value="NO_CORRESPONDE_AVISAR">No corresponde</option>
                  </select>

                  <Button
                    variant={showAll ? "default" : "outline"}
                    onClick={() => setShowAll((prev) => !prev)}
                    className={showAll ? "rounded-xl bg-slate-900 text-white hover:bg-slate-800" : "rounded-xl"}
                  >
                    {showAll ? "Viendo todos" : "Ver todos"}
                  </Button>

                  <Button
                    onClick={() => fetchAlerts({ page: 1, query: search })}
                    className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Buscar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={exportAlertsExcel} className="rounded-xl">
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button variant="outline" onClick={exportAlertsPdf} className="rounded-xl">
                    <FileText className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" onClick={printAlertsReport} className="rounded-xl">
                    Imprimir
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200">
                  <table className="w-full table-auto text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="w-[24%] px-3 py-2.5 font-medium">Cliente</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">Dominio</th>
                        <th className="w-[18%] px-3 py-2.5 font-medium">Vehiculo</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Tramite</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">F. tramite</th>
                        <th className="w-[10%] px-3 py-2.5 font-medium">F. ENARGAS</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Estado</th>
                        <th className="w-[6%] px-3 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            Cargando avisos...
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                            No hay avisos para este filtro.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="truncate font-medium">
                                {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                              </div>
                              <div className="truncate text-[11px] text-slate-600">
                                {row.client?.phone || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="font-semibold tracking-wide whitespace-nowrap">
                                {row.vehicle?.domain || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{formatDate(row.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{formatDate(row.enargasLastOperationDate)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${statusClass(row.status)}`}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAvisar(row)}
                                  disabled={!row.client?.phone || row.status === "NO_CORRESPONDE_AVISAR"}
                                  className={`h-7 gap-1 px-1.5 text-[10px] ${
                                    row.status === "AVISADO"
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : ""
                                  }`}
                                >
                                  {row.status === "AVISADO" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  )}
                                  {row.status === "AVISADO" ? "Avisado" : "Avisar"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-600">
                    Mostrando pagina {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={pagination.page <= 1 || loading}
                      onClick={() => fetchAlerts({ page: pagination.page - 1, query: search })}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages || loading}
                      onClick={() => fetchAlerts({ page: pagination.page + 1, query: search })}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => setRetirosOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-left"
                >
                  {retirosOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  )}
                  <CardTitle className="text-2xl text-slate-900">Retiro de trámites</CardTitle>
                </button>
              </div>
            </CardHeader>

            {retirosOpen ? (
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_120px]">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
                    <Search className="h-4 w-4" />
                    <input
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                      placeholder="Buscar persona o dominio"
                    />
                  </div>
                  <Button
                    onClick={() => fetchDeliveries({ page: 1, query: deliverySearch, filter: deliveryFilter })}
                    className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Buscar
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-[220px]">
                  <select
                    value={deliveryFilter}
                    onChange={(e) => setDeliveryFilter(e.target.value as "yesterday" | "pending" | "all")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="yesterday">Dia anterior</option>
                    <option value="pending">Todos los pendientes</option>
                    <option value="all">Todos</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBulkDeliveryAction("received")}
                    disabled={processingBulk || selectedDeliveryIds.length === 0}
                    className="rounded-xl"
                  >
                    <PackageCheck className="h-4 w-4" />
                    Marcar recibidos ({selectedDeliveryIds.length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBulkDeliveryAction("notified")}
                    disabled={processingBulk || selectedDeliveryIds.length === 0}
                    className="rounded-xl"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Avisar seleccionados
                  </Button>
                  <Button variant="outline" onClick={exportDeliveriesExcel} className="rounded-xl">
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                  <Button variant="outline" onClick={exportDeliveriesPdf} className="rounded-xl">
                    <FileText className="h-4 w-4" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" onClick={printDeliveriesReport} className="rounded-xl">
                    Imprimir
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200">
                  <table className="w-full table-auto text-sm">
                    <thead className="bg-slate-100 text-left text-slate-600">
                      <tr>
                        <th className="w-[4%] px-3 py-2.5 font-medium">
                          <input
                            type="checkbox"
                            checked={
                              deliveryRows.length > 0 &&
                              deliveryRows.every((row) => selectedDeliveryIds.includes(row.id))
                            }
                            onChange={toggleSelectAllVisibleDeliveries}
                          />
                        </th>
                        <th className="w-[18%] px-3 py-2.5 font-medium">Cliente</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Dominio</th>
                        <th className="w-[14%] px-3 py-2.5 font-medium">Vehiculo</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Tramite</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">F. alta</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Abonado</th>
                        <th className="w-[8%] px-3 py-2.5 font-medium">Estado</th>
                        <th className="w-[18%] px-3 py-2.5 font-medium">Obs</th>
                        <th className="w-[16%] px-3 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryLoading ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                            Cargando retiros...
                          </td>
                        </tr>
                      ) : deliveryRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                            No hay trámites para retiro.
                          </td>
                        </tr>
                      ) : (
                        deliveryRows.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={selectedDeliveryIds.includes(row.id)}
                                onChange={() => toggleDeliverySelection(row.id)}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-slate-800">
                              <div className="truncate font-medium">
                                {`${row.client?.lastName || "-"}, ${row.client?.firstName || "-"}`}
                              </div>
                              <div className="truncate text-[11px] text-slate-600">
                                {row.client?.phone || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="font-semibold tracking-wide whitespace-nowrap">
                                {row.vehicle?.domain || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model}` : "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">
                                {procedureLabel(row.procedureType?.code, row.procedureType?.displayName)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate">{formatDate(row.createdAt)}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">{formatAmount(row.amountPaid)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-[1px] text-[9px] font-semibold leading-3 ${deliveryStatusClass(row.status)}`}
                              >
                                {deliveryStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              <div className="truncate" title={stripMetaTags(row.notes) || "-"}>
                                {stripMetaTags(row.notes) || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "received")}
                                  disabled={row.status === "RETIRADO"}
                                  className="h-7 gap-1 px-2 text-[10px]"
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Recibido
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "notified")}
                                  className={`h-7 gap-1 px-2 text-[10px] ${
                                    row.status === "AVISADO_RETIRO"
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                      : ""
                                  }`}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {row.status === "AVISADO_RETIRO" ? "Avisado" : "Avisar"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeliveryAction(row, "retired")}
                                  disabled={!(row.status === "RECIBIDO" || row.status === "AVISADO_RETIRO")}
                                  className="h-7 gap-1 px-2 text-[10px]"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Retirado
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-slate-600">
                    Mostrando pagina {deliveryPagination.page} de {deliveryPagination.totalPages} ({deliveryPagination.total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={deliveryPagination.page <= 1 || deliveryLoading}
                      onClick={() =>
                        fetchDeliveries({
                          page: deliveryPagination.page - 1,
                          query: deliverySearch,
                          filter: deliveryFilter,
                        })
                      }
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      disabled={deliveryPagination.page >= deliveryPagination.totalPages || deliveryLoading}
                      onClick={() =>
                        fetchDeliveries({
                          page: deliveryPagination.page + 1,
                          query: deliverySearch,
                          filter: deliveryFilter,
                        })
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>

      {retireModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-2 pt-16">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Marcar retirado</h3>
                <p className="text-sm text-slate-600">Ingresa el monto abonado al retirar.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRetireModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <input
                value={retireAmountInput}
                onChange={(e) => setRetireAmountInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                placeholder="Monto abonado"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRetireModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmRetiredFromModal} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}


