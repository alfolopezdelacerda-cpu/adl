# Roundtrip TMS

MVP de un TMS (sistema de gestión de transporte) enfocado en **viajes redondos**:
ida, estancia en destino y retorno como una sola unidad operativa.

## Qué incluye

- **Tablero**: viajes activos, ingreso estimado, kilómetros redondos y disponibilidad de flota.
- **Viajes**: listado con búsqueda por folio/cliente/ruta y filtro por estado.
- **Alta de viaje**: formulario con folio automático (`RT-####`) y validaciones básicas.
- **Detalle de viaje**: métricas derivadas (duración, ingreso por km) y cambio de estado.
- **Unidades** y **Operadores**: flota y personal con su asignación vigente.

Los datos son de demostración y viven en el navegador (`localStorage`). No hay base de
datos todavía — ese es el siguiente paso natural (Postgres/Neon + Prisma o Drizzle).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4.

## Desarrollo

```bash
npm install
npm run dev
```

## Estructura

```
app/          rutas (tablero, viajes, unidades, operadores)
components/   navegación y primitivos de UI
lib/          tipos, datos demo, store en cliente y formateadores
```
