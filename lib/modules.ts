import {
  BellRing,
  ClipboardList,
  FileText,
  HandCoins,
  LayoutGrid,
  Users,
} from "lucide-react";

export type AppRole = "OFICINA" | "MESA_ENTRADA";

export const appModules = [
  {
    key: "dashboard",
    href: "/dashboard",
    title: "Dashboard",
    description: "Resumen general del taller, alertas y estado operativo.",
    icon: LayoutGrid,
  },
  {
    key: "clientes",
    href: "/clientes",
    title: "Clientes y Vehiculos",
    description: "Alta, consulta e historial por cliente y dominio.",
    icon: Users,
  },
  {
    key: "tramites",
    href: "/tramites",
    title: "Tramites",
    description: "Gestion de oblea, prueba hidraulica y conversiones.",
    icon: ClipboardList,
  },
  {
    key: "avisos",
    href: "/avisos",
    title: "Avisos",
    description: "Vencimientos del mes y avisos para retiro de tramites.",
    icon: BellRing,
  },
  {
    key: "distribuidoras",
    href: "/distribuidoras",
    title: "Distribuidoras",
    description: "Cuenta corriente, compras, pagos y saldos pendientes.",
    icon: HandCoins,
  },
  {
    key: "comprobantes",
    href: "/comprobantes",
    title: "Comprobantes",
    description: "Recibos, presupuestos y garantias en formato PDF.",
    icon: FileText,
  },
] as const;

export function getModulesByRole(role: AppRole | null | undefined) {
  if (role === "OFICINA") return appModules;
  return appModules.filter(
    (module) =>
      !["avisos", "distribuidoras", "comprobantes"].includes(module.key),
  );
}
