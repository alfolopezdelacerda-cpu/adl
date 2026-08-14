"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { VIAJE_ACTIVO } from "@/lib/types";
import { fecha, km, mxn } from "@/lib/format";
import { Card, EstadoBadge, Empty, Kpi, PageTitle } from "@/components/ui";

export default function Tablero() {
  const { viajes, unidades, operadores, unidad, operador } = useStore();

  const activos = viajes.filter((v) => VIAJE_ACTIVO.includes(v.estado));
  const completados = viajes.filter((v) => v.estado === "completado");
  const facturable = viajes
    .filter((v) => v.estado !== "cancelado")
    .reduce((s, v) => s + v.tarifa, 0);
  const kmTotales = viajes
    .filter((v) => v.estado !== "cancelado")
    .reduce((s, v) => s + v.kmRedondo, 0);
  const unidadesLibres = unidades.filter((u) => u.estado === "disponible");
  const operadoresLibres = operadores.filter((o) => o.estado === "disponible");

  const proximos = [...activos].sort((a, b) =>
    a.salidaIda.localeCompare(b.salidaIda),
  );

  return (
    <>
      <PageTitle
        title="Tablero"
        subtitle="Resumen operativo de viajes redondos."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Viajes activos"
          value={String(activos.length)}
          hint={`${completados.length} completados`}
        />
        <Kpi
          label="Ingreso estimado"
          value={mxn(facturable)}
          hint="Excluye cancelados"
        />
        <Kpi label="Kilómetros redondos" value={km(kmTotales)} />
        <Kpi
          label="Disponibles"
          value={`${unidadesLibres.length} / ${operadoresLibres.length}`}
          hint="Unidades / operadores"
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">Viajes en curso y programados</h2>
          <Link href="/viajes" className="text-sm text-amber hover:underline">
            Ver todos
          </Link>
        </div>

        {proximos.length === 0 ? (
          <Empty>No hay viajes activos.</Empty>
        ) : (
          <ul className="divide-y divide-[#DEE3DD]">
            {proximos.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/viajes/${v.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-black/[0.02]"
                >
                  <span className="w-20 font-mono text-xs text-muted">
                    {v.folio}
                  </span>
                  <span className="font-medium">
                    {v.origen} → {v.destino} → {v.origen}
                  </span>
                  <span className="text-sm text-muted">{v.cliente}</span>
                  <span className="ml-auto flex items-center gap-3 text-sm">
                    <span className="text-muted">
                      {unidad(v.unidadId)?.economico ?? "—"} ·{" "}
                      {operador(v.operadorId)?.nombre ?? "—"}
                    </span>
                    <span className="text-muted">{fecha(v.salidaIda)}</span>
                    <EstadoBadge estado={v.estado} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
