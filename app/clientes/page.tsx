"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import toast from "react-hot-toast";
import { NewClientWithVehicleForm } from "@/components/modules/tramites/new-client-with-vehicle-form";

type Vehicle = {
  id: string;
  domain: string;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  latestProcedure: {
    procedureType: {
      displayName: string;
    } | null;
    distributor: {
      name: string;
    } | null;
  } | null;
  vehicles: Vehicle[];
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);

  async function fetchClients(query?: string) {
    setLoading(true);
    try {
      const url = query?.trim()
        ? `/api/clientes?q=${encodeURIComponent(query.trim())}`
        : "/api/clientes";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar clientes.");
      const json = await res.json();
      setClients(json.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  function handleSearch() {
    fetchClients(search);
  }

  async function handleCreateSuccess() {
    setOpenCreateModal(false);
    await fetchClients(search);
  }

  return (
    <AppShell hideHeader sectionLabel="Modulo" title="Clientes" subtitle="">
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-2xl text-slate-900">
              Clientes y Vehiculos
            </CardTitle>
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Buscar por nombre, telefono o dominio"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
            >
              Buscar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Telefono</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Tramite</th>
                  <th className="px-4 py-3 font-medium">Distribuidora</th>
                  <th className="px-4 py-3 font-medium">Vehiculos</th>
                  <th className="px-4 py-3 font-medium">Dominios</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No hay clientes cargados.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {client.lastName}, {client.firstName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{client.phone}</td>
                      <td className="px-4 py-3 text-slate-700">{client.email || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {client.latestProcedure?.procedureType?.displayName || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {client.latestProcedure?.distributor?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{client.vehicles.length}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {client.vehicles.length
                          ? client.vehicles.map((v) => v.domain).join(", ")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {openCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-10">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Alta de cliente y vehiculo
                </h3>
                <p className="text-sm text-slate-600">
                  Carga rapida desde modulo clientes.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpenCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-auto p-4">
              <NewClientWithVehicleForm compact onSuccess={handleCreateSuccess} />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
