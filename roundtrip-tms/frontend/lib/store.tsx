"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { operadoresSeed, unidadesSeed, viajesSeed } from "./seed";
import type { EstadoViaje, Operador, Unidad, Viaje } from "./types";

const STORAGE_KEY = "roundtrip-tms:v1";

type Data = { viajes: Viaje[]; unidades: Unidad[]; operadores: Operador[] };

type Store = Data & {
  hidratado: boolean;
  agregarViaje: (v: Omit<Viaje, "id" | "folio">) => Viaje;
  cambiarEstado: (id: string, estado: EstadoViaje) => void;
  unidad: (id: string) => Unidad | undefined;
  operador: (id: string) => Operador | undefined;
  reiniciar: () => void;
};

const seed: Data = {
  viajes: viajesSeed,
  unidades: unidadesSeed,
  operadores: operadoresSeed,
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(seed);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw) as Data);
    } catch {
      // almacenamiento no disponible: se sigue con los datos demo
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignorar cuota / modo privado
    }
  }, [data, hidratado]);

  const agregarViaje = useCallback((v: Omit<Viaje, "id" | "folio">) => {
    const creado: Viaje = { ...v, id: `v${Date.now()}`, folio: "" };
    setData((prev) => {
      const max = prev.viajes.reduce((m, x) => {
        const n = Number(x.folio.replace(/\D/g, ""));
        return Number.isFinite(n) && n > m ? n : m;
      }, 2600);
      creado.folio = `RT-${max + 1}`;
      return { ...prev, viajes: [creado, ...prev.viajes] };
    });
    return creado;
  }, []);

  const cambiarEstado = useCallback((id: string, estado: EstadoViaje) => {
    setData((prev) => ({
      ...prev,
      viajes: prev.viajes.map((v) => (v.id === id ? { ...v, estado } : v)),
    }));
  }, []);

  const reiniciar = useCallback(() => setData(seed), []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      hidratado,
      agregarViaje,
      cambiarEstado,
      reiniciar,
      unidad: (id) => data.unidades.find((u) => u.id === id),
      operador: (id) => data.operadores.find((o) => o.id === id),
    }),
    [data, hidratado, agregarViaje, cambiarEstado, reiniciar],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de <StoreProvider>");
  return ctx;
}
