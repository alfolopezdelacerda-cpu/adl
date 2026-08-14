"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { ESTADOS_VIAJE, type EstadoViaje } from "@/lib/types";
import { Card, PageTitle } from "@/components/ui";

const campo =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-amber";
const etiqueta = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted";

export default function NuevoViaje() {
  const router = useRouter();
  const { unidades, operadores, agregarViaje } = useStore();

  const [form, setForm] = useState({
    cliente: "",
    origen: "",
    destino: "",
    salidaIda: "",
    retornoEstimado: "",
    unidadId: "",
    operadorId: "",
    estado: "programado" as EstadoViaje,
    kmRedondo: "",
    tarifa: "",
    notas: "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }) as typeof form);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente || !form.origen || !form.destino || !form.salidaIda) {
      setError("Cliente, origen, destino y fecha de salida son obligatorios.");
      return;
    }
    if (
      form.retornoEstimado &&
      form.retornoEstimado < form.salidaIda
    ) {
      setError("El retorno no puede ser anterior a la salida.");
      return;
    }
    const creado = agregarViaje({
      cliente: form.cliente.trim(),
      origen: form.origen.trim(),
      destino: form.destino.trim(),
      salidaIda: form.salidaIda,
      retornoEstimado: form.retornoEstimado || form.salidaIda,
      unidadId: form.unidadId,
      operadorId: form.operadorId,
      estado: form.estado,
      kmRedondo: Number(form.kmRedondo) || 0,
      tarifa: Number(form.tarifa) || 0,
      notas: form.notas.trim() || undefined,
    });
    router.push(`/viajes/${creado.id}`);
  }

  return (
    <>
      <PageTitle
        title="Nuevo viaje redondo"
        subtitle="El folio se asigna automáticamente al guardar."
      />

      <Card className="max-w-3xl p-5">
        <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={etiqueta}>Cliente *</label>
            <input
              className={campo}
              value={form.cliente}
              onChange={(e) => set("cliente")(e.target.value)}
              placeholder="Grupo Ferretero del Norte"
            />
          </div>

          <div>
            <label className={etiqueta}>Origen *</label>
            <input
              className={campo}
              value={form.origen}
              onChange={(e) => set("origen")(e.target.value)}
              placeholder="CDMX"
            />
          </div>
          <div>
            <label className={etiqueta}>Destino *</label>
            <input
              className={campo}
              value={form.destino}
              onChange={(e) => set("destino")(e.target.value)}
              placeholder="Monterrey"
            />
          </div>

          <div>
            <label className={etiqueta}>Salida (ida) *</label>
            <input
              type="date"
              className={campo}
              value={form.salidaIda}
              onChange={(e) => set("salidaIda")(e.target.value)}
            />
          </div>
          <div>
            <label className={etiqueta}>Retorno estimado</label>
            <input
              type="date"
              className={campo}
              value={form.retornoEstimado}
              onChange={(e) => set("retornoEstimado")(e.target.value)}
            />
          </div>

          <div>
            <label className={etiqueta}>Unidad</label>
            <select
              className={campo}
              value={form.unidadId}
              onChange={(e) => set("unidadId")(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.economico} — {u.tipo}
                  {u.estado === "disponible" ? "" : ` (${u.estado})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Operador</label>
            <select
              className={campo}
              value={form.operadorId}
              onChange={(e) => set("operadorId")(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {operadores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                  {o.estado === "disponible" ? "" : ` (${o.estado})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={etiqueta}>Kilómetros (redondo)</label>
            <input
              type="number"
              min={0}
              className={campo}
              value={form.kmRedondo}
              onChange={(e) => set("kmRedondo")(e.target.value)}
              placeholder="1720"
            />
          </div>
          <div>
            <label className={etiqueta}>Tarifa MXN (redondo)</label>
            <input
              type="number"
              min={0}
              className={campo}
              value={form.tarifa}
              onChange={(e) => set("tarifa")(e.target.value)}
              placeholder="48500"
            />
          </div>

          <div>
            <label className={etiqueta}>Estado inicial</label>
            <select
              className={campo}
              value={form.estado}
              onChange={(e) => set("estado")(e.target.value)}
            >
              {ESTADOS_VIAJE.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={etiqueta}>Notas</label>
            <textarea
              rows={3}
              className={campo}
              value={form.notas}
              onChange={(e) => set("notas")(e.target.value)}
              placeholder="Retorno con carga de compensación…"
            />
          </div>

          {error ? (
            <p className="sm:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Guardar viaje
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-black/[0.03]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
