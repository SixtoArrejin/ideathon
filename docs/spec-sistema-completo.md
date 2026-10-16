# Especificación Técnica Completa: Plataforma Dosel (CarbonTrack NEA)

**Versión:** 1.0.0  
**Fecha:** Octubre 2026  
**Rama:** `analysis`  
**Objetivo:** Definir la arquitectura, modelo de datos, flujos de usuario, integraciones y alcance de ingeniería para transformar el prototipo de hackathon en una plataforma productiva de créditos de carbono con verificación satelital sobre Stellar/Soroban.

---

## 1. Glosario de Dominio (Ubiquitous Language)

| Término | Definición |
|---|---|
| **Predio / Parcela (Parcel)** | Unidad de tierra delimitada por coordenadas geográficas poligonales (GeoJSON) registrada por un propietario para conservación. |
| **Línea Base (Baseline NDVI)** | Valor inicial de vigor de vegetación calculado en la primera verificación histórica del predio contra el cual se miden caídas relativas. |
| **NDVI (Normalized Difference Vegetation Index)** | Índice espectral \((B8 - B4) / (B8 + B4)\) derivado de imágenes satelitales Sentinel-2 que mide la densidad y salud de la biomasa foliar (rango -1 a 1; en bosques chaqueños típicos 0,60 a 0,85). |
| **GreenTon (GTON)** | Token emitido en Soroban que representa 1 tonelada de CO₂ equivalente (1 tCO₂e) absorbida o evitada de deforestación. |
| **Congelamiento (Freeze)** | Estado de bloqueo activado automáticamente por el Smart Contract si el NDVI cae por debajo del umbral mínimo (\(NDVI < 0,400\)) o sufre una caída abrupta (\(\Delta NDVI > 0,150\)). Impide cualquier emisión futura. |
| **Retiro / Quema (Retirement / Burn)** | Destrucción irreversible de tokens GTON en el Smart Contract por parte de un tenedor para acreditar su neutralidad de carbono. Genera un certificado público y perpetuo. |
| **Oráculo Satelital** | Servicio autónomo y verificador que consulta las escenas satelitales, ejecuta el análisis geoespacial y firma transacciones hacia el Smart Contract. |
| **Auditor / Validador Humano** | Entidad certificada con permisos multifirma o rol administrativo capaz de revisar desmontes, falsos positivos por sequía y ejecutar `unfreeze`. |

---

## 2. Límites y Responsabilidades: ¿Qué nos corresponde y qué no?

### 2.1. Lo que SÍ nos corresponde (Alcance de Ingeniería y Producto)
1. **Infraestructura de Smart Contracts (Soroban):**
   - Registro inmutable de predios y propietarios.
   - Reglas de negocio determinísticas (emisión según NDVI, congelamiento automático, quema y trazabilidad).
   - Estándar de token compatible con billeteras y DEX de Stellar (SEP-41).
2. **Motor de Oráculo Satelital y Pipeline de Telemetría:**
   - Ingesta periódica de imágenes satelitales (Sentinel-2 / Landsat vía STAC API).
   - Cálculo de índices de vegetación sobre polígonos arbitrarios (filtrado de nubes y sombras).
   - Algoritmo de cálculo de tCO₂e respaldado por datos.
3. **Plataforma Web y Portales:**
   - **Portal del Propietario:** Carga de polígonos (KML/GeoJSON), validación de titularidad y reclamo de tokens.
   - **Marketplace / Pasarela de Adquisición:** Compraventa de créditos (vía stablecoin USDC o pasarela Web2 fiat).
   - **Portal de Retiro Corporativo:** Quema de créditos con generación de certificados ESG y códigos QR auditables.
   - **Explorador Público / Transparencia:** Visualizador satelital en tiempo real para ONGs, bancos y entes reguladores.
4. **Backend e Indexación (Off-Chain):**
   - Base de datos relacional y geoespacial (PostgreSQL + PostGIS).
   - Indexador de eventos de Stellar para sincronización en tiempo real.
   - Autenticación, gestión de documentos y firma de transacciones.

### 2.2. Lo que NO nos corresponde (Terceros, Regulación y Mundo Físico)
1. **Validación Legal de Títulos de Propiedad:** La plataforma no puede dirimir judicialmente si una escritura es válida. Se apoya en escribanías, colegios notariales y catastros provinciales que validan los KML antes de habilitar el registro.
2. **Creación de Metodologías de Carbono Propias:** Dosel no inventa la fórmula química de absorción. Se deben parametrizar metodologías avaladas internacionalmente (Verra VM0007, Plan Vivo, IPCC Tier 2/3 para el Chaco Seco y Húmedo).
3. **Operación de Constelaciones de Satélites:** Se consumen satélites públicos de agencias espaciales (ESA / NASA) o proveedores comerciales de alta resolución (Planet Labs / SkySat).

---

## 3. Arquitectura del Sistema Completo

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE USUARIOS (WEB)                          │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Portal Propietario │    Marketplace     │ Portal Corporativo (Quema)   │
│ (Carga KML/Catastro)│ (Compraventa GTON) │ (Retiro y Certificados ESG)  │
└─────────┬──────────┴─────────┬──────────┴──────────────┬───────────────┘
          │                    │                         │
          ▼                    ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND API & SERVICIOS                          │
├────────────────────────────────────────────────────────────────────────┤
│ • Auth & RBAC (Dueño, Empresa, Auditor, Admin)                        │
│ • Geoprocesamiento (Validación de polígonos, solapamiento)             │
│ • Motor de Pagos / On-Ramp (Stripe / MercadoPago / Stellar Anchors)    │
│ • Indexador de Blockchain (Sincronización Soroban RPC -> Postgres)     │
└─────────┬──────────────────────────────┬───────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────────┐   ┌─────────────────────────────────────────┐
│ BASE DE DATOS (OFF-CHAIN)│   │           ORÁCULO SATELITAL             │
├──────────────────────────┤   ├─────────────────────────────────────────┤
│ PostgreSQL 16 + PostGIS  │   │ Ingesta Sentinel-2 (Copernicus / STAC)  │
│ • Polígonos de parcelas  │   │ Máscara de nubes + Cálculo NDVI         │
│ • Documentos y auditorías│   │ Firma criptográfica de transacciones    │
│ • Usuarios y órdenes     │   └────────────────────┬────────────────────┘
└──────────────────────────┘                        │
                                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN STELLAR (SOROBAN)                      │
├────────────────────────────────────────────────────────────────────────┤
│ • Contrato GreenTon (GTON): Sep-41 Token, Emisión, Congelamiento      │
│ • Mercado Descentralizado (Stellar DEX / AMM): Liquidez GTON/USDC      │
│ • Registro Inmutable de Retiros: Certificados permanentes on-chain     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Persistencia: ¿Por qué necesitamos PostgreSQL + PostGIS?

En blockchain solo se guarda el estado crítico y mínimo debido al costo computacional y de almacenamiento (rent fees en Soroban). PostgreSQL con PostGIS es **estrictamente necesaria** por las siguientes razones:

1. **Geometrías Complejas:** Un campo real no es un rectángulo simple (`bbox`), sino un polígono irregular con cientos de vértices GPS. PostGIS permite almacenar `GEOMETRY(Polygon, 4326)` y calcular intersecciones, áreas exactas y verificar que ningún campo se solape con otro (`ST_Overlaps`, `ST_Contains`).
2. **Almacenamiento de Documentación Legal:** Escrituras traslativas de dominio, certificados de libre deuda inmobiliaria, DNI/CUIT de apoderados y resoluciones de planes de manejo de bosques nativos (Ley 26.331).
3. **Indexación y Búsqueda Rápida:** Filtrar predios por provincia, rango de hectáreas, historial de NDVI, estado de auditoría y volumen de emisión sin consultar nodo por nodo en la blockchain.
4. **Auditoría Off-chain y Telemetría Histórica:** Guardar el registro de cada escena satelital analizada cada 5 días, porcentajes de cobertura nubosa y logs de ejecución del oráculo.

### Esquema Relacional Esencial (PostgreSQL + PostGIS)

```sql
-- Extensiones
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios y Organizaciones
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(56) UNIQUE, -- Dirección G... de Stellar
    role VARCHAR(32) NOT NULL, -- 'owner', 'buyer', 'auditor', 'admin'
    company_name VARCHAR(255),
    tax_id VARCHAR(64), -- CUIT/RUT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parcelas / Predios
CREATE TABLE parcels (
    id VARCHAR(32) PRIMARY KEY, -- Ej: 'IMPEN1'
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    province VARCHAR(64) NOT NULL,
    geometry GEOMETRY(Polygon, 4326) NOT NULL, -- Polígono exacto
    bounding_box BOX2D GENERATED ALWAYS AS (Box2D(geometry)) STORED,
    surface_hectares NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_AUDIT', -- 'PENDING_AUDIT', 'ACTIVE', 'FROZEN', 'REJECTED'
    contract_address VARCHAR(56),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mediciones Satelitales (Telemetría de Oráculo)
CREATE TABLE satellite_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id VARCHAR(32) REFERENCES parcels(id),
    period_id INTEGER NOT NULL, -- AAAAMM
    scene_id VARCHAR(128) NOT NULL,
    scene_date DATE NOT NULL,
    cloud_coverage_pct NUMERIC(5, 4),
    calculated_ndvi NUMERIC(5, 4) NOT NULL,
    tco2e_calculated NUMERIC(12, 2) NOT NULL,
    stellar_tx_hash VARCHAR(64),
    blockchain_status VARCHAR(32), -- 'MINTED', 'FROZEN', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificados de Retiro (Quema)
CREATE TABLE retirement_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retirement_index INTEGER NOT NULL, -- ID on-chain
    holder_address VARCHAR(56) NOT NULL,
    beneficiary_name VARCHAR(255) NOT NULL,
    amount_tco2e NUMERIC(12, 2) NOT NULL,
    reason TEXT,
    stellar_tx_hash VARCHAR(64) UNIQUE NOT NULL,
    certificate_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. Especificación de los Flujos de Usuario

### 5.1. Flujo del Dueño de Campo (Onboarding y Registro)
1. **Registro:** El dueño crea una cuenta en la plataforma con su CUIT y conecta o crea su cuenta en Stellar.
2. **Carga del Predio:**
   - Dibuja en un mapa interactivo o sube un archivo `.kml` / `.geojson` / `Shapefile` de su propiedad.
   - Adjunta constancia de título de propiedad y certificado catastral.
3. **Validación Automática y Humana:**
   - El sistema valida que el polígono no se solape con otros predios registrados (`PostGIS`).
   - Un auditor humano aprueba la validez legal del catastro.
4. **Registro On-Chain:**
   - Se invoca `register_parcel` en Soroban con el ID del predio, la billetera del dueño, las hectáreas y el polígono.

### 5.2. Flujo del Oráculo y Emisión Periódica
1. **Disparador:** Un cronjob periódico (ej. mensual o por temporada fenológica) activa el oráculo.
2. **Ingesta:** El oráculo consulta la API de Sentinel-2 filtrando escenas con menos de 10% de cobertura de nubes para el polígono del predio.
3. **Cálculo:** Se calcula el NDVI pixel a pixel, promediando el valor neto dentro del polígono.
4. **Evaluación de Reglas de Contrato:**
   - Si \(NDVI < 0,400\) o \(Baseline - NDVI > 0,150\): se invoca la verificación que marca `frozen = true` y emisión `0`.
   - Si el vigor se mantiene: se calcula \(tCO_2e = ha \times factor\_absorcion \times factor\_vigor\) y se llama a `submit_verification`.
5. **Acreditación:** El Smart Contract Soroban acuña los tokens `GTON` directamente en el saldo de la billetera del dueño.

### 5.3. Flujo de Compraventa y Liquidación
1. **Listado en Marketplace:** El dueño puede dejar sus tokens en su billetera, o listarlos en el libro de órdenes del DEX de Stellar a un precio determinado en USDC (ej: \$12 USDC/GTON).
2. **Compra:**
   - **Comprador Web3:** Conecta su billetera (Freighter), selecciona la cantidad y paga en USDC.
   - **Comprador Corporativo Tradicional (Web2):** Paga mediante transferencia bancaria o tarjeta. Una pasarela custodia y adquiere los tokens en Stellar en su nombre, depositándolos en su cuenta corporativa.

### 5.4. Flujo de Retiro y Certificación (Quema)
1. La empresa compradora accede al portal de retiros.
2. Ingresa la cantidad de toneladas a retirar y el nombre del beneficiario (ej. *"Campaña Carbono Neutro 2026 - Sucursal Resistencia"*).
3. Firma la transacción `retire(holder, amount, beneficiary)` en Soroban.
4. El contrato destruye los tokens, decrementa el suministro circulante e incrementa el contador de retiros.
5. La plataforma emite automáticamente un **Certificado ESG Oficial descargable en PDF con código QR y enlace permanente a Stellar Expert**.

---

## 6. Brecha Actual: Qué tenemos hoy vs. Qué falta construir

| Componente | Estado Actual (Prototipo Hackathon) | Estado Requerido (Producto Completo) |
|---|---|---|
| **Smart Contract** | Funcional en Testnet (registro, verificación, congelamiento, balance, retiro). Llave única de admin y oráculo. | Soporte Multi-firma (Multi-sig) para oráculos y auditores. Compatibilidad formal SEP-41 completa. Auditoría de seguridad. |
| **Oráculo Satelital** | Script en Python local que corre contra bounding box (`bbox`) rectangular simplificado. | Servicio contenerizado en nube (FastAPI/Celery) que procesa polígonos GeoJSON arbitrarios con máscaras de nubes dinámicas. |
| **Base de Datos** | Archivos estáticos JSON (`parcels.json`, `verifications.json`). | PostgreSQL 16 + PostGIS para gestión geoespacial, usuarios, auditorías e histórico. |
| **Frontend - Explorador** | Visualizador de 3 predios en Leaflet con lectura RPC directa y panel de retiro con Freighter. | Portal multi-rol con Dashboard de Propietario, Carga interactiva de KML, Marketplace de compraventa y Generador de certificados ESG. |
| **Integración de Pagos** | Inexistente (solo transferencias directas de tokens en Stellar). | Pasarela de pago FIAT -> USDC / GTON (Rampas locales de Stellar, Stripe, transferencias bancarias locales). |
| **Autenticación** | Ninguna (solo lectura pública y firma manual en Freighter). | Auth0 / Supabase / NextAuth con inicio de sesión Web2 (Google/Email) vinculado a Smart Wallets (Passkeys / SEP-30). |

---

## 7. Plan de Implementación por Fases

1. **Fase 1 (Semanas 1-4) - Persistencia y Portal de Propietario:**
   - Montaje de PostgreSQL + PostGIS.
   - Módulo de carga y validación de archivos `.kml`/`.geojson` con previsualización en mapa.
   - API REST en FastAPI / Node.js para administración de predios.
2. **Fase 2 (Semanas 5-8) - Oráculo Autónomo en Producción:**
   - Pipeline de geoprocesamiento automatizado con reintentos y tolerancia a fallos.
   - Despliegue de red de oráculos multi-nodo con consenso de firmas.
3. **Fase 3 (Semanas 9-12) - Marketplace y On-Ramp de Pagos:**
   - Integración con el DEX de Stellar para liquidez de `GTON/USDC`.
   - Pasarela para compra directa de créditos en moneda local con liquidación en Stellar.
   - Generador automático de certificados de compensación con firma digital.
