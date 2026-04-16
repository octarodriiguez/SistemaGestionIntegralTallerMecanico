import {
  BellRing,
  ClipboardList,
  FileText,
  HandCoins,
  Settings,
  LayoutGrid,
  Users,
  BarChart3,
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
    key: "reportes",
    href: "/reportes",
    title: "Reportes",
    description: "Estadísticas de trámites por mes, tipo y comparativas anuales.",
    icon: BarChart3,
  },
  {
    key: "comprobantes",
    href: "/comprobantes",
    title: "Comprobantes",
    description: "Recibos, presupuestos y garantias en formato PDF.",
    icon: FileText,
  },
  {
    key: "configuracion",
    href: "/configuracion",
    title: "Configuracion",
    description: "Parametros y ajustes generales del sistema.",
    icon: Settings,
  },
] as const;

export function getModulesByRole(role: AppRole | null | undefined) {
  if (role === "OFICINA") return appModules;
  return appModules.filter(
    (module) =>
      !["avisos", "distribuidoras", "comprobantes", "configuracion"].includes(module.key),
  );
}
