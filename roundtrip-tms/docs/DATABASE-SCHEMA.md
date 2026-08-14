# ROUNDTRIP TMS - Database Architecture

## 📊 3 Instancias PostgreSQL Separadas

```
┌─────────────────────────────────────────────────────────────┐
│  BD TRANSPORTES (transportes_db)                            │
│  - Flota propia, conductores, solicitudes, liquidaciones    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BD FORWARDING (forwarding_db)                              │
│  - Clientes, documentos aduanales, proveedores (incluye ADL) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  BD MONITOREO (monitoreo_db) — COMPARTIDA                   │
│  - GPS real-time, incidencias, track-trace, auditoría global│
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ BD TRANSPORTES

### Tablas Principales

#### `users` (Usuarios del Sistema)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role ENUM('admin', 'dispatcher', 'driver', 'accountant', 'manager') NOT NULL,
  keycloak_id VARCHAR(255),
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(255),
  mfa_backup_codes TEXT[], -- JSON array cifrada
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID REFERENCES users(id),
  
  -- Auditoría
  deleted_at TIMESTAMP,
  deleted_by_id UUID REFERENCES users(id),
  
  INDEX idx_email,
  INDEX idx_keycloak_id
);
```

#### `conductores` (Drivers)
```sql
CREATE TABLE conductores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(255) NOT NULL,
  email_encrypted VARCHAR(500), -- AES-256-GCM
  telefono_encrypted VARCHAR(500), -- AES-256-GCM
  rfc_encrypted VARCHAR(500), -- AES-256-GCM
  curp_encrypted VARCHAR(500), -- AES-256-GCM
  licencia_numero VARCHAR(100),
  licencia_vencimiento DATE,
  cuenta_bancaria_encrypted VARCHAR(500), -- AES-256-GCM
  banco VARCHAR(100),
  clabe_encrypted VARCHAR(500), -- AES-256-GCM
  
  -- Control
  estado ENUM('activo', 'inactivo', 'suspendido', 'baja') DEFAULT 'activo',
  fecha_contratacion DATE,
  fecha_baja DATE,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by_id UUID REFERENCES users(id),
  
  INDEX idx_rfc,
  INDEX idx_estado
);
```

#### `vehiculos` (Fleet)
```sql
CREATE TABLE vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(20) UNIQUE NOT NULL,
  tipo ENUM('full_trailer', 'sencillo', 'rabon', 'pickup') NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  anio INT,
  vin VARCHAR(100) UNIQUE,
  capacidad_toneladas DECIMAL(10,2),
  capacidad_volumen_m3 DECIMAL(10,2),
  
  -- Documentos
  poliza_seguro VARCHAR(100),
  vencimiento_seguro DATE,
  tenencia_pagada BOOLEAN,
  verificacion_vigente BOOLEAN,
  
  -- GPS/Telemetría
  gps_imei VARCHAR(50),
  gps_proveedor VARCHAR(50),
  
  -- Finanzas
  valor_adquisicion DECIMAL(15,2),
  fecha_adquisicion DATE,
  depreciation_monthly DECIMAL(15,2),
  
  -- Control
  estado ENUM('operativo', 'mantenimiento', 'fuera_servicio', 'vendido') DEFAULT 'operativo',
  fecha_baja DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_placa,
  INDEX idx_tipo,
  INDEX idx_estado
);
```

#### `solicitudes_transportes` (Transport Requests)
```sql
CREATE TABLE solicitudes_transportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_solicitud VARCHAR(50) UNIQUE NOT NULL,
  
  -- Referencia Forwarding (si viene de integración API)
  ref_forwarding_id VARCHAR(100),
  
  -- Origen / Destino
  origen_direccion VARCHAR(500),
  origen_latitud DECIMAL(10,8),
  origen_longitud DECIMAL(11,8),
  destino_direccion VARCHAR(500),
  destino_latitud DECIMAL(10,8),
  destino_longitud DECIMAL(11,8),
  
  -- Carga
  peso_kg DECIMAL(12,2),
  volumen_m3 DECIMAL(10,2),
  descripcion_carga TEXT,
  tipo_carga ENUM('general', 'perecedero', 'peligroso', 'fragil'),
  
  -- Responsables
  cliente_id VARCHAR(100), -- Referencia a cliente_id
  conductor_asignado_id UUID REFERENCES conductores(id),
  vehiculo_asignado_id UUID REFERENCES vehiculos(id),
  dispatcher_id UUID REFERENCES users(id),
  
  -- Fechas
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_requerida DATE,
  fecha_inicio_viaje TIMESTAMP,
  fecha_entrega TIMESTAMP,
  
  -- Estados
  estado ENUM('solicitado', 'confirmado', 'en_ruta', 'entregado', 'cancelado', 'error') DEFAULT 'solicitado',
  
  -- Tarificación
  km_estimados INT,
  km_reales INT,
  tarifa_unitaria DECIMAL(10,2),
  monto_total DECIMAL(15,2),
  
  -- Incidencias
  incidencia_id UUID REFERENCES incidencias(id),
  
  -- Documentos
  carta_porte_cfdi_id VARCHAR(100),
  comprobante_entrega VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_numero_solicitud,
  INDEX idx_estado,
  INDEX idx_conductor,
  INDEX idx_fecha_solicitud
);
```

#### `liquidaciones` (Driver Settlements)
```sql
CREATE TABLE liquidaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID REFERENCES conductores(id) NOT NULL,
  periodo_inicio DATE,
  periodo_fin DATE,
  
  -- Ingresos
  total_km INT,
  tarifa_por_km DECIMAL(10,2),
  subtotal_transporte DECIMAL(15,2),
  bonos DECIMAL(15,2) DEFAULT 0,
  
  -- Descuentos
  descuentos DECIMAL(15,2) DEFAULT 0,
  avances_efectivo DECIMAL(15,2) DEFAULT 0,
  multas DECIMAL(15,2) DEFAULT 0,
  
  -- Total
  total_neto DECIMAL(15,2),
  
  -- Control
  estado ENUM('borrador', 'revisada', 'pagada', 'cancelada') DEFAULT 'borrador',
  fecha_pago DATE,
  numero_comprobante_pago VARCHAR(50),
  
  -- Auditoría
  creada_por_id UUID REFERENCES users(id),
  revisada_por_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_conductor,
  INDEX idx_periodo,
  INDEX idx_estado
);
```

#### `gastos_operativos` (Operating Expenses)
```sql
CREATE TABLE gastos_operativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo ENUM('diesel', 'peajes', 'mantenimiento', 'reparacion', 'otros') NOT NULL,
  monto DECIMAL(15,2),
  fecha DATE,
  
  -- Responsables
  conductor_id UUID REFERENCES conductores(id),
  vehiculo_id UUID REFERENCES vehiculos(id),
  registrado_por_id UUID REFERENCES users(id),
  
  -- Control
  requiere_aprobacion BOOLEAN DEFAULT false,
  aprobado BOOLEAN DEFAULT false,
  aprobado_por_id UUID REFERENCES users(id),
  
  -- Comprobante
  comprobante_uuid VARCHAR(100),
  descripcion TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tipo,
  INDEX idx_vehiculo,
  INDEX idx_conductor
);
```

---

## 2️⃣ BD FORWARDING

### Tablas Principales

#### `clientes_forwarding` (International Freight Clients)
```sql
CREATE TABLE clientes_forwarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  rfc_encrypted VARCHAR(500), -- AES-256-GCM
  email_encrypted VARCHAR(500), -- AES-256-GCM
  telefono_encrypted VARCHAR(500), -- AES-256-GCM
  
  -- Dirección
  direccion VARCHAR(500),
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  pais VARCHAR(100),
  
  -- Contacto principal
  contacto_nombre VARCHAR(255),
  contacto_puesto VARCHAR(100),
  
  -- Términos
  plazo_pago INT DEFAULT 30, -- días
  incoterm VARCHAR(20), -- FOB, CIF, etc.
  
  -- Crédito
  linea_credito_aprobada DECIMAL(15,2),
  linea_credito_usada DECIMAL(15,2) DEFAULT 0,
  
  -- Control
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_rfc,
  INDEX idx_activo
);
```

#### `proveedores_forwarding` (Providers - includes ADL Transportes)
```sql
CREATE TABLE proveedores_forwarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  tipo ENUM('agente_aduanal', 'almacen', 'transportista', 'seguros') NOT NULL,
  
  -- Transportista especial: ADL Transportes
  es_adl_transportes BOOLEAN DEFAULT false,
  api_endpoint VARCHAR(255), -- http://adl-transportes/api/v1
  api_key_encrypted VARCHAR(500), -- AES-256-GCM
  
  -- Contacto
  email_encrypted VARCHAR(500),
  telefono_encrypted VARCHAR(500),
  
  -- Financiero
  plazo_pago INT DEFAULT 30,
  margen_aplicable DECIMAL(5,2) DEFAULT 15, -- 15% margen
  
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tipo,
  INDEX idx_es_adl_transportes
);
```

#### `solicitudes_forwarding` (International Freight Orders)
```sql
CREATE TABLE solicitudes_forwarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_orden VARCHAR(50) UNIQUE NOT NULL,
  
  -- Cliente
  cliente_id UUID REFERENCES clientes_forwarding(id),
  
  -- Tipo
  tipo ENUM('importacion', 'exportacion', 'almacenaje', 'distribucion') NOT NULL,
  
  -- Origen / Destino
  puerto_origen VARCHAR(100),
  puerto_destino VARCHAR(100),
  aeropuerto_origen VARCHAR(100),
  aeropuerto_destino VARCHAR(100),
  
  -- Carga
  descripcion_carga TEXT,
  peso_kg DECIMAL(12,2),
  volumen_m3 DECIMAL(10,2),
  cantidad_bultos INT,
  hs_code VARCHAR(50), -- Código arancelario
  
  -- Documentos
  bl_numero VARCHAR(100), -- Bill of Lading
  bl_fecha DATE,
  invoice_numero VARCHAR(100),
  invoice_monto DECIMAL(15,2),
  invoice_moneda VARCHAR(3),
  packing_list VARCHAR(255),
  
  -- Transporte
  incoterm VARCHAR(20),
  
  -- Si requiere transporte terrestre (de Transportes)
  requiere_transporte_terrestre BOOLEAN DEFAULT false,
  solicitud_transporte_id UUID REFERENCES solicitudes_transportes(id),
  
  -- Proveedores
  agente_aduanal_id UUID REFERENCES proveedores_forwarding(id),
  almacen_id UUID REFERENCES proveedores_forwarding(id),
  transportista_terrestre_id UUID REFERENCES proveedores_forwarding(id),
  
  -- Fechas
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_estimada_arribo DATE,
  fecha_despacho DATE,
  
  -- Estado
  estado ENUM('cotizacion', 'confirmada', 'en_transito', 'aduanaje', 'entregada', 'cancelada') DEFAULT 'cotizacion',
  
  -- Costing
  costo_transporte DECIMAL(15,2),
  costo_aduanaje DECIMAL(15,2),
  costo_almacenaje DECIMAL(15,2),
  costo_seguros DECIMAL(15,2),
  subtotal_costos DECIMAL(15,2),
  margen_aplicado DECIMAL(15,2),
  monto_factura_cliente DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_numero_orden,
  INDEX idx_cliente_id,
  INDEX idx_estado,
  INDEX idx_solicitud_transporte_id
);
```

---

## 3️⃣ BD MONITOREO (Compartida)

### Tablas Principales

#### `gps_eventos` (Real-time GPS)
```sql
CREATE TABLE gps_eventos (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identificadores
  solicitud_id UUID NOT NULL,
  vehiculo_id UUID NOT NULL,
  conductor_id UUID NOT NULL,
  
  -- Ubicación
  latitud DECIMAL(10,8),
  longitud DECIMAL(11,8),
  velocidad_kmh DECIMAL(5,2),
  rumbo INT, -- 0-360°
  
  -- Señal
  velocidad_gps INT, -- 0-100% (calidad señal)
  satellites INT,
  hdop DECIMAL(5,2), -- Horizontal dilution of precision
  
  -- Timestamp
  timestamp_evento TIMESTAMP NOT NULL,
  timestamp_recepcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Auditoría
  empresa ENUM('transportes', 'forwarding'),
  
  INDEX idx_solicitud_timestamp (solicitud_id, timestamp_evento),
  INDEX idx_vehiculo_timestamp (vehiculo_id, timestamp_evento),
  INDEX idx_timestamp (timestamp_evento)
);
```

#### `incidencias` (Incidents)
```sql
CREATE TABLE incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia
  solicitud_id UUID NOT NULL,
  vehiculo_id UUID NOT NULL,
  conductor_id UUID NOT NULL,
  
  -- Tipo
  tipo ENUM(
    'accidente',
    'robo',
    'falla_mecanica',
    'desvio_ruta',
    'retraso',
    'documentacion_incompleta',
    'cliente_rechazo',
    'otros'
  ) NOT NULL,
  
  -- Severidad
  severidad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
  
  -- Descripción
  descripcion TEXT,
  evidencia_urls TEXT[], -- Array de URLs a fotos/videos
  
  -- Ubicación
  latitud DECIMAL(10,8),
  longitud DECIMAL(11,8),
  
  -- Responsabilidad
  responsable ENUM('conductor', 'tercero', 'cliente', 'adl', 'indeterminado') DEFAULT 'indeterminado',
  
  -- Resolución
  estado ENUM('reportada', 'asignada', 'en_proceso', 'resuelta', 'cerrada') DEFAULT 'reportada',
  resolucion TEXT,
  
  -- Auditoría
  reportada_por_id UUID REFERENCES users(id),
  asignada_a_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tipo,
  INDEX idx_solicitud_id,
  INDEX idx_estado
);
```

#### `track_trace_publico` (Customer Portal Tracking)
```sql
CREATE TABLE track_trace_publico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia segura (no expone ID interno)
  token_publico VARCHAR(100) UNIQUE NOT NULL,
  solicitud_id UUID NOT NULL,
  
  -- Permiso
  cliente_email_encrypted VARCHAR(500), -- AES-256-GCM
  valido_hasta TIMESTAMP,
  
  -- Datos públicos a mostrar
  origen_publico VARCHAR(255),
  destino_publico VARCHAR(255),
  estado_actual VARCHAR(100),
  porcentaje_progreso INT,
  fecha_estimada_entrega DATE,
  
  -- Últimas locaciones (agregadas)
  ultimas_locaciones JSONB, -- [{lat, lng, timestamp}, ...]
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_token_publico,
  INDEX idx_solicitud_id
);
```

#### `auditoria_sistema` (System Audit Log)
```sql
CREATE TABLE auditoria_sistema (
  id BIGSERIAL PRIMARY KEY,
  
  -- Actor
  usuario_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent VARCHAR(500),
  
  -- Acción
  entidad VARCHAR(100), -- 'users', 'vehiculos', 'solicitudes', etc.
  accion ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN') NOT NULL,
  
  -- Datos
  registro_id UUID,
  cambios_anteriores JSONB,
  cambios_nuevos JSONB,
  
  -- Contexto
  razon TEXT,
  
  -- Timestamp
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_usuario_timestamp (usuario_id, timestamp),
  INDEX idx_entidad_accion (entidad, accion),
  INDEX idx_timestamp (timestamp)
);
```

---

## 🔒 Encriptación de Campos Sensibles

### Campos AES-256-GCM por Tabla:

**Conductores:**
- email_encrypted
- telefono_encrypted
- rfc_encrypted
- curp_encrypted
- cuenta_bancaria_encrypted
- clabe_encrypted

**Clientes Forwarding:**
- rfc_encrypted
- email_encrypted
- telefono_encrypted

**Proveedores Forwarding:**
- api_key_encrypted (si es ADL Transportes)
- email_encrypted
- telefono_encrypted

**Track Trace Público:**
- cliente_email_encrypted

---

## 📊 Migraciones TypeORM

```bash
# Generar migrations automáticamente
npm run typeorm migration:generate -- -n CreateInitialSchema

# Ejecutar migrations
npm run typeorm migration:run

# Revertir última migration
npm run typeorm migration:revert
```

---

## 🎯 Índices Críticos (Performance)

1. `gps_eventos`: `(solicitud_id, timestamp_evento)` para queries de ruta
2. `auditoria_sistema`: `(usuario_id, timestamp)` para reportes de auditoría
3. `solicitudes_transportes`: `(conductor_id, fecha_solicitud)` para pagos
4. `track_trace_publico`: `token_publico` (unique) para público

---

## 🔄 Integración: Flujo de Datos

```
ADL FORWARDING solicita transporte
  └─> POST /api/v1/cotizacion
       └─> ADL TRANSPORTES recibe, cotiza
            └─> Responde precio + disponibilidad
  
  └─> POST /api/v1/ordenes
       └─> ADL TRANSPORTES crea solicitud_transportes
            └─> Genera carta_porte (CFDI 4.0)
            └─> Asigna conductor + vehículo
            └─> Notifica a Forwarding via webhook
  
  └─> BD Monitoreo recibe eventos GPS
       └─> Track Trace público actualiza
       └─> Notificaciones a cliente
  
  └─> Entrega confirmada
       └─> Liquidación a conductor
       └─> Factura CFDI a ADL Forwarding
       └─> Forwarding factura a cliente con margen
```

---

## ⚙️ Conexión desde Backend

```javascript
// Transportes DB
const transportesConnection = getConnection('transportes');

// Forwarding DB
const forwardingConnection = getConnection('forwarding');

// Monitoreo DB
const monitoreoConnection = getConnection('monitoreo');
```

