"use client";

import { useStore } from "@/lib/store";
import { VIAJE_ACTIVO } from "@/lib/types";
import { Card, PageTitle } from "@/components/ui";

const claseEstado: Record<string, string> = {
  disponible: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  en_viaje: "bg-blue-50 text-blue-700 ring-blue-200",
  descanso: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default function Operadores() {
  const { operadores, viajes } = useStore();

  return (
    <>
      <PageTitle
        title="Operadores"
        subtitle={`${operadores.length} operadores registrados`}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Operador</th>
                <th className="px-4 py-2.5 font-medium">Licencia</th>
                <th className="px-4 py-2.5 font-medium">Teléfono</th>
                <th className="px-4 py-2.5 font-medium">Viaje actual</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Viajes completados
                </th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE3DD]">
              {operadores.map((o) => {
                const actual = viajes.find(
                  (v) =>
                    v.operadorId === o.id && VIAJE_ACTIVO.includes(v.estado),
                );
                const completados = viajes.filter(
                  (v) => v.operadorId === o.id && v.estado === "completado",
                ).length;
                return (
                  <tr key={o.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-medium">{o.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {o.licencia}
                    </td>
                    <td className="px-4 py-3 text-muted">{o.telefono}</td>
                    <td className="px-4 py-3 text-muted">
                      {actual
                        ? `${actual.folio} · ${actual.origen} → ${actual.destino}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {completados}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${claseEstado[o.estado]}`}
                      >
                        {o.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
