"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ESTADOS_VIAJE, type EstadoViaje } from "@/lib/types";
import { fecha, km, mxn } from "@/lib/format";
import { Card, Empty, EstadoBadge, PageTitle } from "@/components/ui";

export default function Viajes() {
  const { viajes, unidad, operador } = useStore();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<EstadoViaje | "todos">("todos");

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return viajes
      .filter((v) => (estado === "todos" ? true : v.estado === estado))
      .filter((v) =>
        texto
          ? [v.folio, v.cliente, v.origen, v.destino].some((c) =>
              c.toLowerCase().includes(texto),
            )
          : true,
      )
      .sort((a, b) => b.salidaIda.localeCompare(a.salidaIda));
  }, [viajes, q, estado]);

  return (
    <>
      <PageTitle
        title="Viajes"
        subtitle={`${filtrados.length} de ${viajes.length} viajes redondos`}
        action={
          <Link
            href="/viajes/nuevo"
            className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nuevo viaje
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar folio, cliente o ruta…"
          className="min-w-56 flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-amber"
        />
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoViaje | "todos")}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-amber"
        >
          <option value="todos">Todos los estados</option>
          {ESTADOS_VIAJE.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden">
        {filtrados.length === 0 ? (
          <Empty>Ningún viaje coincide con el filtro.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Folio</th>
                  <th className="px-4 py-2.5 font-medium">Ruta redonda</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Unidad / operador</th>
                  <th className="px-4 py-2.5 font-medium">Salida</th>
                  <th className="px-4 py-2.5 text-right font-medium">Km</th>
                  <th className="px-4 py-2.5 text-right font-medium">Tarifa</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE3DD]">
                {filtrados.map((v) => (
                  <tr key={v.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/viajes/${v.id}`} className="hover:underline">
                        {v.folio}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {v.origen} → {v.destino} → {v.origen}
                    </td>
                    <td className="px-4 py-3 text-muted">{v.cliente}</td>
                    <td className="px-4 py-3 text-muted">
                      {unidad(v.unidadId)?.economico ?? "—"} ·{" "}
                      {operador(v.operadorId)?.nombre ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {fecha(v.salidaIda)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {km(v.kmRedondo)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {mxn(v.tarifa)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={v.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
