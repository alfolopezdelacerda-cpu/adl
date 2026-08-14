# Roundtrip TMS

Monorepo del TMS de ADL: transportes, forwarding y monitoreo.

```
roundtrip-tms/
├── backend/     NestJS + TypeORM + Keycloak (3 Postgres + Redis + ELK vía Docker)
├── frontend/    Next.js 15 (App Router) — portal operativo
├── docs/        DATABASE-SCHEMA.md, CLAUDE-CODE-SETUP.md
└── .env.example
```

## Estado actual

| Pieza | Estado |
|---|---|
| `frontend/` | ✅ Funcional y desplegado en Vercel. Tablero, viajes (listado/alta/detalle), unidades, operadores. Datos demo en `localStorage`, sin API todavía. |
| `backend/src/main.ts` | ✅ Entry point con Helmet, rate limiting, CORS, validación e interceptor de auditoría. |
| `backend/src/modules/auth/auth.module.ts` | ✅ Módulo OAuth2 + Keycloak + JWT. |
| `backend/src/security/encryption/encryption.service.ts` | ✅ AES-256-GCM para campos sensibles. |
| `backend/` compilable | ❌ Faltan `app.module.ts`, `auth.service.ts`, estrategias Passport, `audit.interceptor.ts`, `all-exceptions.filter.ts`, `logger.ts` y las entidades TypeORM. |
| Infraestructura dev | ✅ `backend/infrastructure/docker/docker-compose.dev.yml` (3 Postgres, Redis, Keycloak, Elasticsearch, Kibana). |

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Stack: Next.js 15, React 19, TypeScript, Tailwind CSS 4.

Pantallas: **Tablero** (viajes activos, ingreso estimado, km redondos, disponibilidad),
**Viajes** (búsqueda + filtro por estado), **Nuevo viaje** (folio automático `RT-####`),
**Detalle** (duración, ingreso por km, cambio de estado), **Unidades** y **Operadores**.

Los datos son de demostración y viven en el navegador. El siguiente paso es sustituir
`lib/store.tsx` por un cliente contra la API de NestJS.

## Backend

```bash
cd backend
cp ../.env.example ../.env.local     # y rellenar secretos
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
npm install
npm run dev
```

Requiere completar los archivos pendientes de la tabla anterior antes de compilar.

## Despliegue

- **Frontend → Vercel.** Proyecto con *Root Directory* = `frontend`. Cada push despliega.
- **Backend → NO va en Vercel.** Necesita procesos de larga vida, Postgres, Redis y Keycloak;
  el destino natural es un host de contenedores (Railway, Render, Fly.io, ECS o Kubernetes).

## Documentación

- [`docs/DATABASE-SCHEMA.md`](docs/DATABASE-SCHEMA.md) — las 3 bases (transportes, forwarding,
  monitoreo), campos cifrados AES-256-GCM e índices críticos.
- [`docs/CLAUDE-CODE-SETUP.md`](docs/CLAUDE-CODE-SETUP.md) — guía de arranque del entorno.

## Seguridad

Secretos solo en `.env.local` (ignorado por git). `JWT_SECRET` y `ENCRYPTION_KEY` de 32+
caracteres. Campos personales (RFC, CURP, CLABE, teléfono, email) se guardan cifrados según
el esquema.
