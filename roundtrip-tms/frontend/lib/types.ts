export type EstadoViaje =
  | "programado"
  | "en_ruta_ida"
  | "en_destino"
  | "en_ruta_vuelta"
  | "completado"
  | "cancelado";

export type EstadoUnidad = "disponible" | "en_viaje" | "taller";
export type EstadoOperador = "disponible" | "en_viaje" | "descanso";

export type Viaje = {
  id: string;
  folio: string;
  cliente: string;
  origen: string;
  destino: string;
  salidaIda: string; // YYYY-MM-DD
  retornoEstimado: string; // YYYY-MM-DD
  unidadId: string;
  operadorId: string;
  estado: EstadoViaje;
  kmRedondo: number;
  tarifa: number; // MXN, viaje redondo completo
  notas?: string;
};

export type Unidad = {
  id: string;
  economico: string;
  placas: string;
  tipo: string;
  capacidadTon: number;
  estado: EstadoUnidad;
};

export type Operador = {
  id: string;
  nombre: string;
  licencia: string;
  telefono: string;
  estado: EstadoOperador;
};

export const ESTADOS_VIAJE: { value: EstadoViaje; label: string }[] = [
  { value: "programado", label: "Programado" },
  { value: "en_ruta_ida", label: "En ruta (ida)" },
  { value: "en_destino", label: "En destino" },
  { value: "en_ruta_vuelta", label: "En ruta (vuelta)" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

export const ESTADO_LABEL: Record<EstadoViaje, string> = ESTADOS_VIAJE.reduce(
  (acc, e) => ({ ...acc, [e.value]: e.label }),
  {} as Record<EstadoViaje, string>,
);

export const ESTADO_CLASS: Record<EstadoViaje, string> = {
  programado: "bg-slate-100 text-slate-700 ring-slate-200",
  en_ruta_ida: "bg-blue-50 text-blue-700 ring-blue-200",
  en_destino: "bg-violet-50 text-violet-700 ring-violet-200",
  en_ruta_vuelta: "bg-amber-50 text-amber-800 ring-amber-200",
  completado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelado: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const VIAJE_ACTIVO: EstadoViaje[] = [
  "programado",
  "en_ruta_ida",
  "en_destino",
  "en_ruta_vuelta",
];
