# 🚀 ROUNDTRIP TMS - Claude Code Setup Guide

## Paso 1: Abrir Claude Code en Desktop

```bash
# Si no tienes Claude Desktop instalado:
# Descarga desde: https://claude.ai/download

# Abre Claude Desktop → Selecciona "Claude Code"
```

**Nota:** Estás leyendo esto porque ya confirmaste:
- ✅ Backend: Node.js + NestJS
- ✅ Frontend: React + Next.js
- ✅ Auth: Keycloak self-hosted
- ✅ SO: Windows WSL2

---

## Paso 2: Descargar Archivos Base

Descargaste estos archivos base:
```
├── roundtrip-init.sh           (Script de inicialización)
├── DATABASE-SCHEMA.md          (Arquitectura BD completa)
├── backend-main.ts             (Entry point NestJS con seguridad)
├── auth.module.ts              (Módulo autenticación + Keycloak)
├── encryption.service.ts       (Encriptación AES-256-GCM)
└── ROUNDTRIP_PDR_2026.html     (PDR enterprise completo)
```

---

## Paso 3: Preparar Ambiente (WSL2)

```bash
# En WSL2 (terminal Linux dentro de Windows):

# 1. Crear carpeta del proyecto
mkdir -p ~/proyectos/roundtrip-tms
cd ~/proyectos/roundtrip-tms

# 2. Copiar archivos descargados
# (Asume que están en /mnt/c/Users/TuUsuario/Downloads/)
cp /mnt/c/Users/TuUsuario/Downloads/roundtrip-init.sh .
cp /mnt/c/Users/TuUsuario/Downloads/*.ts .
cp /mnt/c/Users/TuUsuario/Downloads/*.md .

# 3. Hacer script ejecutable
chmod +x roundtrip-init.sh

# 4. Ejecutar script de inicialización
./roundtrip-init.sh
```

**Output esperado:**
```
✅ ROUNDTRIP TMS inicializado exitosamente!

📁 Ubicación: /root/roundtrip-tms

🚀 Próximos pasos:
  1. cd roundtrip-tms
  2. cp .env.example .env.local
  3. cd backend && docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
  4. npm install && npm run dev
```

---

## Paso 4: Enviar a Claude Code

En **Claude Desktop** (Claude Code tab):

```
Paste this command:

cd ~/proyectos/roundtrip-tms && ls -la
```

Esto verifica que la estructura está lista.

---

## Paso 5: Iniciar en Claude Code

### 5A. Backend Setup

```
En Claude Code, ejecuta:

cd ~/proyectos/roundtrip-tms/backend

# Instalar dependencias
npm install

# Ver que package.json está correcto
cat package.json

# Copiar variables de entorno
cp ../.env.example ../.env.local

# IMPORTANTE: Editar .env.local con tus valores
# Mínimo requerido:
POSTGRES_PASSWORD=SecurePass123!
REDIS_PASSWORD=RedisPass123!
KEYCLOAK_PASSWORD=KeycloakPass123!
JWT_SECRET=tu-jwt-secret-aqui-min-32-chars
```

### 5B. Base de Datos & Servicios

```bash
# Levantar Docker Compose (desde backend/)
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d

# Esperar ~30 segundos a que todos estén healthy
docker-compose -f infrastructure/docker/docker-compose.dev.yml ps

# Esperado:
# Container                                  State
# roundtrip-postgres-transportes         Up (healthy)
# roundtrip-postgres-forwarding          Up (healthy)
# roundtrip-postgres-monitoreo           Up (healthy)
# roundtrip-redis                        Up (healthy)
# roundtrip-keycloak                     Up (healthy)
# roundtrip-elasticsearch                Up (healthy)
# roundtrip-kibana                       Up (healthy)
```

### 5C. Inicializar Base de Datos

```bash
cd backend

# Crear migrations (TypeORM)
npm run build

# Ejecutar migrations
npm run db:migrate

# Seed datos iniciales (usuarios de prueba, etc.)
npm run db:seed
```

### 5D. Iniciar Backend

```bash
# En terminal 1 (backend en development):
npm run dev

# Esperado:
# 🚀 ROUNDTRIP TMS Backend iniciado en puerto 3000 (development)
# 🔒 Seguridad activada:
#   ✓ Helmet headers configurados
#   ✓ Rate limiting activo
#   ✓ CORS configurado
#   ✓ Input validation activo
#   ✓ Auditoría global activada
```

### 5E. Frontend Setup (Nueva Terminal)

```bash
cd ~/proyectos/roundtrip-tms/frontend

npm install

# Iniciar Next.js (dev)
npm run dev

# Esperado:
# ▲ Next.js 14.0.0
# - Local: http://localhost:3001
```

---

## Paso 6: Verificar Todo Funciona

### 6A. Health Check

```bash
# Backend health
curl http://localhost:3000/health

# Esperado:
# {
#   "status": "ok",
#   "timestamp": "2026-08-14T...",
#   "version": "1.0.0"
# }
```

### 6B. Keycloak Admin

```
Abre navegador: http://localhost:8080

Login:
  Usuario: admin
  Password: KeycloakPass123! (del .env.local)

Crear realm "roundtrip-tms":
  1. Left sidebar → Create Realm
  2. Name: roundtrip-tms
  3. Create
```

### 6C. Frontend Load

```
Abre navegador: http://localhost:3001

Esperado:
- Página de login
- Redirección a Keycloak
```

### 6D. Kibana Logs

```
Abre navegador: http://localhost:5601

Buscar logs del backend (si hay eventos)
```

---

## 📝 Estructura Generada

```
roundtrip-tms/
├── .env.local                              # Variables (NO COMMIT)
├── .gitignore
├── README.md
│
├── backend/
│   ├── package.json                       # Dependencies (Node.js + NestJS)
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts                        ✅ Con seguridad 9-layers
│   │   ├── app.module.ts                  (por crear)
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts         ✅ OAuth2 + Keycloak + JWT
│   │   │   │   ├── auth.service.ts        (por crear)
│   │   │   │   ├── auth.controller.ts     (por crear)
│   │   │   │   ├── strategies/
│   │   │   │   └── entities/
│   │   │   │
│   │   │   ├── transportes/               (por crear)
│   │   │   ├── forwarding/                (por crear)
│   │   │   ├── monitoreo/                 (por crear)
│   │   │   └── sat/                       (por crear)
│   │   │
│   │   ├── common/
│   │   │   ├── middleware/                (por crear)
│   │   │   ├── guards/                    (por crear)
│   │   │   ├── decorators/                (por crear)
│   │   │   ├── interceptors/
│   │   │   │   └── audit.interceptor.ts   (por crear)
│   │   │   ├── filters/
│   │   │   │   └── all-exceptions.filter.ts (por crear)
│   │   │   └── logger.ts                  (por crear)
│   │   │
│   │   ├── security/
│   │   │   ├── encryption/
│   │   │   │   └── encryption.service.ts  ✅ AES-256-GCM
│   │   │   ├── vault/                     (por crear)
│   │   │   └── audit/                     (por crear)
│   │   │
│   │   └── database/
│   │       ├── migrations/                (TypeORM)
│   │       ├── entities/                  (Models)
│   │       └── seeds/                     (Datos iniciales)
│   │
│   ├── infrastructure/
│   │   ├── docker/
│   │   │   └── docker-compose.dev.yml     ✅ Postgres + Redis + Keycloak + ELK
│   │   ├── kubernetes/                    (para producción)
│   │   └── terraform/                     (para AWS)
│   │
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── security/
│
├── frontend/
│   ├── package.json                       # Dependencies (React + Next.js)
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   │
│   ├── apps/
│   │   ├── portal-transportes/            (por crear)
│   │   ├── portal-forwarding/             (por crear)
│   │   └── mobile-web/                    (por crear)
│   │
│   ├── packages/
│   │   ├── ui/                            (componentes reutilizables)
│   │   ├── hooks/                         (React hooks)
│   │   ├── utils/                         (funciones utilidad)
│   │   └── security/                      (CSRF, XSS protection)
│   │
│   └── public/
│
└── docs/
    ├── api/
    │   └── API-SPEC.md                    (por crear)
    ├── security/
    │   └── SECURITY.md                    ✅ OWASP Top 10 (en PDR)
    └── deployment/
        └── README.md                      (por crear)
```

---

## 🎯 Próximos Archivos por Crear en Claude Code

### Backend Críticos:
1. ✅ main.ts (Entry point)
2. ✅ auth.module.ts (OAuth2)
3. ✅ encryption.service.ts (AES-256-GCM)
4. ❌ app.module.ts (App controller)
5. ❌ auth.service.ts (Lógica autenticación)
6. ❌ keycloak.strategy.ts (Passport Keycloak)
7. ❌ jwt.strategy.ts (JWT validation)
8. ❌ mfa.service.ts (TOTP + SMS)
9. ❌ audit.interceptor.ts (Bitácora global)
10. ❌ all-exceptions.filter.ts (Error handling)

### Frontend Críticos:
1. ❌ pages/login.tsx (Login Keycloak)
2. ❌ pages/dashboard.tsx (Panel principal)
3. ❌ hooks/useAuth.ts (Auth context)
4. ❌ components/ProtectedRoute.tsx (RBAC)
5. ❌ lib/api-client.ts (Axios + JWT)

### BDs & Integraciones:
1. ✅ DATABASE-SCHEMA.md (Esquema SQL)
2. ❌ migrations (TypeORM auto-generated)
3. ❌ docker-compose.prod.yml (Kubernetes)
4. ❌ .github/workflows/ci-cd.yml (GitHub Actions)

---

## 📚 Comandos Útiles (Claude Code)

```bash
# Backend
npm run dev                    # Develop mode
npm run build                  # Compilar TypeScript
npm run test                   # Unit tests
npm run test:security          # Tests de seguridad
npm run lint                   # ESLint
npm run db:migrate             # Ejecutar migrations

# Frontend
npm run dev                    # Dev server
npm run build                  # Build optimizado
npm run test                   # Jest tests
npm run type-check             # TypeScript check

# Docker
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs -f

# Keycloak API (admin)
curl -X POST http://localhost:8080/realms/roundtrip-tms/protocol/openid-connect/token \
  -d client_id=admin-cli \
  -d username=admin \
  -d password=KeycloakPass123! \
  -d grant_type=password
```

---

## 🔒 Seguridad - Pre-flight Checklist

- [ ] JWT_SECRET en .env.local (32+ chars)
- [ ] ENCRYPTION_KEY en .env.local (32+ chars)
- [ ] Postgres passwords cambiadas de defaults
- [ ] Keycloak realm creado + client registrado
- [ ] CORS_ORIGIN apunta solo a localhost:3001 (dev)
- [ ] Rate limiting habilitado
- [ ] MFA habilitado en Keycloak
- [ ] Audit logs activado
- [ ] SSL/TLS en .env (para producción)
- [ ] WAF rules configuradas (en Kubernetes)

---

## 🆘 Si Hay Problemas

### Docker containers no levantan
```bash
# Ver logs
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs

# Reiniciar
docker-compose -f infrastructure/docker/docker-compose.dev.yml down
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

### npm install falla
```bash
# Limpiar cache
rm package-lock.json
npm cache clean --force
npm install
```

### Keycloak no responde
```bash
# Esperar más (tarda ~60 seg en iniciar)
docker-compose -f infrastructure/docker/docker-compose.dev.yml logs keycloak
```

### Puerto en uso
```bash
# Backend (3000)
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Frontend (3001)
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

## 🎓 Recursos

- **NestJS Docs:** https://docs.nestjs.com
- **Next.js Docs:** https://nextjs.org/docs
- **Keycloak Docs:** https://www.keycloak.org/documentation
- **TypeORM Docs:** https://typeorm.io
- **OWASP Top 10:** https://owasp.org/Top10/

---

## 📞 Contacto & Escalation

- **Backend Issues:** Ver `logs/` o `docker logs roundtrip-*`
- **Frontend Issues:** Abrir DevTools (F12) → Console
- **Security Issues:** ⚠️ CONFIDENCIAL - Contactar Security Officer

---

**¡Listo para empezar! 🚀**

En Claude Code, ejecuta:
```bash
cd ~/proyectos/roundtrip-tms
ls -la
git status
```

