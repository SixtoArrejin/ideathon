# Especificación Técnica Completa: Plataforma Dosel (CarbonTrack NEA)

**Versión:** 1.1.0  
**Fecha:** Octubre 2026  
**Rama:** `analysis`  
**Objetivo:** Definir la arquitectura integral, modelo de datos, flujos de usuario, integraciones y decisiones pragmáticas para transformar el prototipo de ideathon en una plataforma de créditos de carbono con verificación satelital sobre Stellar/Soroban y persistencia en Supabase (PostgreSQL + PostGIS).

---

## 1. Glosario de Dominio (Ubiquitous Language)

| Término | Definición |
|---|---|
| **Predio** | Unidad territorial delimitada por un polígono geográfico GPS registrada por un propietario para la conservación de bosque nativo. |
| **Línea Base** | Medición inicial de vigor vegetal calculada en la primera verificación histórica del predio, usada para detectar caídas anómalas. |
| **NDVI (Normalized Difference Vegetation Index)** | Índice espectral derivado de reflectancias roja e infrarroja cercana de satélite Sentinel-2 que cuantifica la salud de la cubierta arbórea. |
| **GreenTon (GTON)** | Token en Soroban equivalente exactamente a 1 tonelada de CO₂ equivalente capturada o protegida de deforestación. |
| **Congelamiento** | Estado de penalización irreversible por contrato que bloquea permanentemente la emisión de créditos ante caídas de vegetación. |
| **Retiro** | Quema irreversible de tokens GTON en el contrato inteligente para certificar la compensación de huella de carbono de un beneficiario. |
| **Oráculo** | Agente automatizado que procesa telemetría satelital y firma verificaciones periódicas directamente hacia el contrato Soroban. |
| **Indexador de Eventos** | Servicio en segundo plano que escucha los eventos emitidos por el contrato Soroban (`Minted`, `Frozen`, `Retired`) y sincroniza la base de datos en tiempo real. |
| **Billetera Asistida (Embedded Wallet)** | Cuenta en Stellar generada y custodiada por la plataforma vinculada al correo del productor rural para eliminar la fricción de claves privadas. |
| **Buy & Retire (Compra y Quema Directa)** | Flujo transaccional donde una empresa adquiere créditos en moneda estable (USDC/XLM) y los destruye en la misma operación, emitiendo su certificado al instante. |

---

## 2. Límites y Responsabilidades: ¿Qué nos corresponde y qué no?

### 2.1. Lo que SÍ nos corresponde (Alcance de Ingeniería y Producto)
1. **Infraestructura de Smart Contracts (Soroban):**
   - Registro inmutable de predios y propietarios.
   - Reglas de negocio determinísticas (emisión según NDVI, congelamiento automático, quema y trazabilidad).
   - Módulo de Marketplace directo (listados de venta y compra con liquidación atómica).
2. **Motor de Oráculo Satelital y Pipeline de Telemetría:**
   - Ingesta periódica de imágenes satelitales (Sentinel-2 vía STAC API de Microsoft Planetary Computer).
   - Cálculo de índices de vegetación sobre polígonos arbitrarios (filtrado de nubes y sombras).
   - Algoritmo de cálculo de tCO₂e respaldado por datos.
3. **Plataforma Web y Portales:**
   - **Portal del Propietario:** Carga de polígonos (KML/GeoJSON), onboarding sin fricción cripto y panel de balance de créditos.
   - **Marketplace / Pasarela de Adquisición:** Compraventa atómica de créditos (`GTON/USDC`) con opción de quema inmediata.
   - **Portal de Retiro Corporativo:** Quema de créditos con generación de certificados ESG y códigos QR auditables.
   - **Explorador Público / Transparencia:** Visualizador satelital en tiempo real para ONGs, bancos y entes reguladores.
4. **Backend e Indexación (Off-Chain en Supabase):**
   - Base de datos relacional y geoespacial (PostgreSQL 16 + PostGIS).
   - Indexador de eventos de Stellar para sincronización en tiempo real.
   - Autenticación (Supabase Auth) y almacenamiento seguro de documentación catastral.

### 2.2. Lo que NO nos corresponde (Terceros, Regulación y Mundo Físico)
1. **Validación Legal de Títulos de Propiedad:** La plataforma no dictamina si una escritura es legítima. Se apoya en colegios notariales, registros de propiedad y escribanos certificados que validan los KML antes de habilitar el registro.
2. **Creación de Metodologías de Carbono Propias:** Dosel no inventa la fórmula química de absorción. Se parametrizan metodologías avaladas internacionalmente (Verra VM0007, Plan Vivo, IPCC Tier 2/3 para el Chaco Seco y Húmedo).
3. **Operación de Constelaciones de Satélites:** Se consumen satélites públicos de agencias espaciales (ESA / NASA) o proveedores comerciales de alta resolución (Planet Labs).

---

## 3. Arquitectura del Sistema Híbrido (Web2 + Web3)

### 3.1. ¿Por qué conviven Blockchain y Base de Datos?
* **La Blockchain (Stellar/Soroban)** es el **Banco y la Notaría Pública Inmutable**: garantiza escasez digital, propiedad incorruptible sin intermediarios, reglas matemáticas de congelamiento y certificados de quema que sobreviven incluso si la empresa Dosel desaparece.
* **La Base de Datos (Supabase / Postgres + PostGIS)** es el **Mostrador de Atención y Archivo Rápido**: almacena polígonos GPS pesados de miles de puntos, PDFs de títulos de propiedad, usuarios, sesiones y permite búsquedas geoespaciales instantáneas en milisegundos.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE USUARIOS (WEB)                          │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Portal Propietario │    Marketplace     │ Portal Corporativo (Quema)   │
│ (Login Web2 / KML) │ (Buy & Retire USDC)│ (Certificados ESG y PDF)     │
└─────────┬──────────┴─────────┬──────────┴──────────────┬───────────────┘
          │                    │                         │
          ▼                    ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 BACKEND API & SERVICIOS (SUPABASE)                     │
├────────────────────────────────────────────────────────────────────────┤
│ • Supabase Auth: Onboarding con Email/Google + Billetera Asistida      │
│ • Geoprocesamiento: Validación PostGIS (detección de solapamiento)     │
│ • Event Listener / Indexador: Sincronizador continuo Soroban -> Postgres│
└─────────┬──────────────────────────────┬───────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────────┐   ┌─────────────────────────────────────────┐
│ BASE DE DATOS (SUPABASE) │   │           ORÁCULO SATELITAL             │
├──────────────────────────┤   ├─────────────────────────────────────────┤
│ PostgreSQL 16 + PostGIS  │   │ Ingesta Sentinel-2 (Copernicus / STAC)  │
│ • Polígonos de predios   │   │ Máscara de nubes + Cálculo NDVI         │
│ • Documentos catastrales │   │ Invocación on-chain de verificación     │
│ • Órdenes de marketplace │   └────────────────────┬────────────────────┘
└──────────────────────────┘                        │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN STELLAR (SOROBAN)                      │
├────────────────────────────────────────────────────────────────────────┤
│ • Contrato GreenTon (GTON): Emisión, Congelamiento, Quema (Retire)     │
│ • Contrato Marketplace Escrow: Listados a precio fijo y swap atómico   │
│ • Eventos Públicos: Tópicos 'Minted', 'Frozen', 'Retired'              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Persistencia en Supabase: Esquema Relacional Completo

```sql
-- Extensiones obligatorias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Usuarios y Organizaciones (Productores y Empresas)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(56) UNIQUE NOT NULL, -- Billetera pública G...
    stellar_seed_encrypted TEXT,                 -- Clave cifrada para billetera asistida (MVP)
    role VARCHAR(32) NOT NULL DEFAULT 'OWNER',   -- 'OWNER', 'BUYER', 'AUDITOR', 'ADMIN'
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    tax_id VARCHAR(64),                          -- CUIT / RUT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Predios Registrados
CREATE TABLE parcels (
    id VARCHAR(32) PRIMARY KEY,                  -- Código legible: 'IMPEN1', 'CHACO1'
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    province VARCHAR(64) NOT NULL,
    department VARCHAR(128),
    geometry GEOMETRY(Polygon, 4326) NOT NULL,   -- Polígono GPS exacto
    surface_hectares NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',-- 'ACTIVE', 'FROZEN', 'PENDING_AUDIT'
    baseline_ndvi NUMERIC(5, 4),
    last_ndvi NUMERIC(5, 4),
    total_issued_tco2e NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice geoespacial para consultas y detección de solapamiento
CREATE INDEX idx_parcels_geometry ON parcels USING GIST (geometry);

-- 3. Telemetría y Verificaciones del Oráculo Satelital
CREATE TABLE satellite_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id VARCHAR(32) REFERENCES parcels(id),
    period_id INTEGER NOT NULL,                  -- Formato AAAAMM (ej. 202603)
    scene_id VARCHAR(128) NOT NULL,              -- Identificador Sentinel-2 L2A
    scene_date DATE NOT NULL,
    cloud_coverage_pct NUMERIC(5, 4),
    calculated_ndvi NUMERIC(5, 4) NOT NULL,
    tco2e_issued NUMERIC(12, 2) NOT NULL,
    stellar_tx_hash VARCHAR(64) NOT NULL,
    action_taken VARCHAR(32) NOT NULL,           -- 'MINTED', 'FROZEN', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Marketplace: Ofertas de Venta y Compras
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id),
    parcel_id VARCHAR(32) REFERENCES parcels(id),
    amount_tco2e NUMERIC(12, 2) NOT NULL,
    price_per_ton_usdc NUMERIC(10, 2) NOT NULL,  -- Precio en dólares digitales
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',  -- 'OPEN', 'SOLD', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Certificados de Retiro y Compensación (Quemas On-Chain)
CREATE TABLE retirement_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retirement_index INTEGER NOT NULL,           -- Índice correlativo en Soroban
    holder_address VARCHAR(56) NOT NULL,
    beneficiary_name VARCHAR(255) NOT NULL,
    amount_tco2e NUMERIC(12, 2) NOT NULL,
    stellar_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Especificación de los Tres Componentes Clave (Decisiones para el MVP)

### 5.1. Componente A: Abstracción de Billetera para el Productor Rural (Web2.5 Onboarding)
* **La Decisión de Diseño:** Eliminar la barrera de las 24 palabras y la instalación obligatoria de extensiones.
* **Mecanismo:**
  1. El productor se registra en la web con su correo electrónico o Google (vía Supabase Auth).
  2. En el primer inicio de sesión, el backend genera automáticamente un par de claves de Stellar (`Keypair.random()`).
  3. La clave pública queda asociada a su perfil y la clave privada se almacena cifrada en Supabase.
  4. Cuando el oráculo verifica el campo, el Smart Contract deposita los `GTON` directamente en su clave pública.
  5. En su panel web ve su saldo en toneladas y el botón *"Poner a la venta en el marketplace"*.
  6. **Opción Soberana:** Quien desee auto-custodia puede hacer clic en *"Exportar clave privada"* o vincular su billetera Freighter en cualquier momento.

### 5.2. Componente B: Marketplace Simplificado ("Buy & Retire" Atómico)
* **La Decisión de Diseño:** Evitar la complejidad técnica de lidiar con libros de órdenes cruzados del DEX clásico en este MVP. En su lugar, implementar una **Venta Directa a Precio Fijo con opción de Quema Inmediata**.
* **Mecanismo:**
  1. **Publicación:** El dueño indica cuántas toneladas de su saldo desea vender y fija su precio (ej. 1.000 GTON a \$15 USDC c/u).
  2. **La Experiencia del Comprador (Empresa):**
     - La empresa no necesita saber qué es un token ni guardarlo en una billetera.
     - En el catálogo selecciona: *"Quiero compensar 200 toneladas con bosque nativo de El Impenetrable"*.
     - Escribe su nombre: *"Empresa Transporte Norte S.A."*.
     - Paga con testnet USDC o XLM mediante Freighter (o pasarela simulada).
  3. **Transacción Atómica On-Chain:**
     El contrato inteligente ejecuta en una sola transacción:
     - Transfiere el pago al productor rural.
     - Ejecuta la función `retire` quemando los 200 GTON a nombre de *"Empresa Transporte Norte S.A."*.
     - Emite el certificado de retiro en el mismo instante.

### 5.3. Componente C: Sincronizador / Indexador de Eventos (Blockchain $\rightarrow$ Supabase)
* **La Decisión de Diseño:** Un worker liviano en Node.js/TypeScript que consulta periódicamente `getEvents` en la RPC de Soroban.
* **Mecanismo:**
  1. El servicio consulta eventos del contrato desde el último bloque analizado (`startLedger`).
  2. Filtra por tópicos del contrato:
     - `Minted`: Actualiza `parcels.total_issued_tco2e` y añade un registro a `satellite_verifications`.
     - `Frozen`: Actualiza `parcels.status = 'FROZEN'`.
     - `Retired`: Inserta el registro en `retirement_certificates`.
  3. Esto asegura que la base de datos de Supabase sea un reflejo 100% fidedigno e instantáneo de lo que sucede en la blockchain de Stellar.

---

## 6. Plan de Implementación Inmediato

1. **Paso 1:** Ejecutar la migración inicial en Supabase creando las tablas `users`, `parcels`, `satellite_verifications`, `marketplace_listings` y `retirement_certificates` con soporte PostGIS.
2. **Paso 2:** Crear el endpoint/formulario de carga de predios (subida de KML / dibujo de polígono con previsualización en mapa).
3. **Paso 3:** Implementar el módulo de Marketplace ("Buy & Retire") en el frontend.
4. **Paso 4:** Conectar el indexador de eventos para reflejar las quemas y emisiones en Supabase.
