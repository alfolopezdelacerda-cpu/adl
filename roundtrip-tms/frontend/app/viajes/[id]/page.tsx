"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { ESTADOS_VIAJE, type EstadoViaje } from "@/lib/types";
import { fecha, km, mxn } from "@/lib/format";
import { Card, EstadoBadge, PageTitle, Pill } from "@/components/ui";

export default function DetalleViaje() {
  const params = useParams<{ id: string }>();
  const { viajes, unidad, operador, cambiarEstado } = useStore();
  const viaje = viajes.find((v) => v.id === params.id);

  if (!viaje) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">
          No se encontró el viaje.{" "}
          <Link href="/viajes" className="text-amber hover:underline">
            Volver a viajes
          </Link>
        </p>
      </Card>
    );
  }

  const u = unidad(viaje.unidadId);
  const o = operador(viaje.operadorId);
  const dias =
    (Date.parse(viaje.retornoEstimado) - Date.parse(viaje.salidaIda)) /
      86_400_000 +
    1;
  const costoKm = viaje.kmRedondo ? viaje.tarifa / viaje.kmRedondo : 0;

  return (
    <>
      <PageTitle
        title={`${viaje.origen} → ${viaje.destino} → ${viaje.origen}`}
        subtitle={`${viaje.folio} · ${viaje.cliente}`}
        action={
          <Link
            href="/viajes"
            className="rounded-md border border-line px-3 py-2 text-sm hover:bg-black/[0.03]"
          >
            Volver
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Detalle del viaje</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Dato k="Salida (ida)" v={fecha(viaje.salidaIda)} />
            <Dato k="Retorno estimado" v={fecha(viaje.retornoEstimado)} />
            <Dato
              k="Duración"
              v={Number.isFinite(dias) ? `${Math.max(1, dias)} día(s)` : "—"}
            />
            <Dato k="Kilómetros redondos" v={km(viaje.kmRedondo)} />
            <Dato k="Tarifa" v={mxn(viaje.tarifa)} />
            <Dato
              k="Ingreso por km"
              v={costoKm ? `${mxn(Math.round(costoKm))}/km` : "—"}
            />
            <Dato
              k="Unidad"
              v={u ? `${u.economico} · ${u.placas}` : "Sin asignar"}
            />
            <Dato
              k="Operador"
              v={o ? `${o.nombre} · ${o.telefono}` : "Sin asignar"}
            />
            <Dato k="Estado" v={<EstadoBadge estado={viaje.estado} />} />
          </dl>

          {viaje.notas ? (
            <p className="mt-5 rounded-md bg-black/[0.03] px-3 py-2 text-sm text-muted">
              {viaje.notas}
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Actualizar estado</h2>
          <div className="flex flex-col gap-2">
            {ESTADOS_VIAJE.map((e) => (
              <button
                key={e.value}
                onClick={() => cambiarEstado(viaje.id, e.value as EstadoViaje)}
                className={`rounded-md px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors ${
                  viaje.estado === e.value
                    ? "bg-ink text-white ring-transparent"
                    : "bg-white ring-[#DEE3DD] hover:bg-black/[0.03]"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Los cambios se guardan en este navegador.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{u?.tipo ?? "Sin unidad"}</Pill>
            <Pill>{u ? `${u.capacidadTon} t` : "—"}</Pill>
          </div>
        </Card>
      </div>
    </>
  );
}

function Dato({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
      <dd className="mt-1 font-medium">{v}</dd>
    </div>
  );
}
