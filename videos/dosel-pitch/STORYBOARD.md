# Storyboard — Dosel Pitch & Product Demo

**Total**: 120.0s · **Aspect**: 1920x1080 · **Voice**: Team live voiceover (Spanish, synchronized to on-screen captions & `SCRIPT.md`) · **Music**: `assets/bgm/dosel-ambient.mp3` (100 BPM atmospheric electronic pulse)

### 01 — El Problema: La Crisis del Gran Chaco (`0.0s – 14.0s`)
- **Say**: "Solo en el último año, el norte argentino perdió más de doscientas diez mil hectáreas de bosque nativo. Y el mercado actual de bonos de carbono no alcanza para frenarlo: depende de PDFs estáticos, auditorías aisladas y registros opacos donde el comprador nunca puede verificar si esos árboles siguen en pie."
- **Show**: Dark satellite grid over Gran Chaco (`25° 30' S · 61° 30' O`), kinetic counter rolling to `210.702 ha` lost in 2025 (`119.886 ha` in 2024, `+7.000.000 ha` total), contrasted with a struck-through static PDF certificate card ("Auditoría única · Riesgo de doble conteo · Sin polígono público").
- **Motion**: Blueprint `editorial-stat-reveal` · `entrance-fade-translate` + `counter-roll` + orbital scan line sweep · Exit: `slide` transition at 14.0s.

### 02 — La Propuesta: Dosel y el Ciclo de Verificación (`14.0s – 28.0s`)
- **Say**: "Por eso creamos Dosel: infraestructura abierta que convierte vegetación real del Gran Chaco en créditos verificables sobre Stellar. Nuestro Oráculo procesa telemetría multiespectral de los satélites Sentinel-dos, y emite en contratos Soroban un GreenTon por cada tonelada de dióxido de carbono capturada, atado a su Predio y período exactos."
- **Show**: Dosel brand lockup (*"El bosque, verificado desde arriba"*), live hero preview of `ideathon-henna.vercel.app`, and animated 4-stage pipeline (`01 Sentinel-2 L2A` → `02 Oráculo NDVI + Cobertura` → `03 Contratos Soroban` → `04 Red Stellar: 1 GTON = 1 tCO₂e`) with live Testnet badges (`61.239 GTON` active · `500 tCO₂e` retired).
- **Motion**: Blueprint `diagram-build` · staggered card reveal + sequential connector pulse · Exit: `fade` transition at 28.0s.

### 03 — Demo en Vivo: Predios Activos y Evidencia Sentinel-2 (`28.0s – 44.0s`)
- **Say**: "Miremos la plataforma en vivo. En la vista de Predios, cualquier persona puede auditar cada polígono registrado sin pedir permiso. En el Impenetrable y el Parque Nacional Chaco, el índice de vigor vegetal NDVI se mantiene firme sobre cero coma setecientos sesenta y ocho, habilitando la emisión transparente de cada Lote en la blockchain."
- **Show**: Interactive browser frame of `ideathon-henna.vercel.app/#predios` alongside high-res Sentinel-2 capture (`assets/sat-impen.png`). Animated cursor selects `IMPEN1 (1.380 ha)` and `CHACO1 (1.370 ha)`, zooming into the NDVI stability gauge (`0,768 → 0,769 · ESTABLE`), `28.181 GTON` issued, and direct links to the ESA scene and Stellar Expert.
- **Motion**: Blueprint `ui-walkthrough` · cursor glide + click ripple + HUD inspection card zoom · Exit: `wipe` transition at 44.0s.

### 04 — Regla Imparcial: Congelamiento Automático y Doble Señal (`44.0s – 62.0s`)
- **Say**: "¿Pero qué pasa cuando la vegetación cae? Al seleccionar la parcela Taco Pozo, vemos que su NDVI cayó más de cero coma quince puntos respecto a su Línea Base, y el contrato Soroban la congeló automáticamente: emite cero tokens. Además, cruzamos el NDVI con mapas anuales de cobertura arbórea a diez metros para filtrar tanto falsos positivos agrícolas como desmontes encubiertos."
- **Show**: Split / transitioning showcase of `assets/app-predios.png` (`TACOP1 · 996 ha`, NDVI drop `0,814 → 0,612 (-0,202)`, coral alert `CONGELADO: NO EMITE`) into `assets/app-cobertura.png` (`Cobertura del suelo` tab with Impact Observatory 10m bars: `83% cultivos / 17% árboles` catching agricultural seasonality false positives vs. `100% → 21%` trees catching false negatives).
- **Motion**: Blueprint `comparison-split` · cursor click on `TACOP1` → coral freeze pulse → crossfade/slide to `app-cobertura.png` with highlighted validation callouts · Exit: `slide` transition at 62.0s.

### 05 — Demo del Mercado: «Comprar es Compensar» (`62.0s – 80.0s`)
- **Say**: "En el Mercado de Dosel, eliminamos la especulación secundaria y el greenwashing: comprar es compensar. La empresa elige un Lote con origen satelital trazable, ingresa las toneladas y firma con su billetera Freighter. En una sola transacción atómica en Soroban, la función buy and retire transfiere el pago al productor forestal y quema los tokens para siempre a nombre del beneficiario."
- **Show**: Live walkthrough from `assets/app-mercado.png` (`Oferta 0 · IMPEN1 · 2026-03` at `0,1 XLM/t`) to clicking `Comprar y quemar`, opening `assets/app-modal.png` (`Confirmar compra y quema`: `500 t`, `50 XLM`, `"Empresa Demo SA - huella 2026"`, `Firmar con Freighter`), plus bottom atomic transaction diagram (`buy_and_retire`: Cobro SAC → 95% Productor / 5% Comisión → Quema irreversible `Retirement #0`).
- **Motion**: Blueprint `ui-modal-flow` · cursor clicks `Comprar y quemar` → modal scale-in (`app-modal.png`) → click on `Firmar con Freighter` → atomic settlement badge reveal · Exit: `fade` transition at 80.0s.

### 06 — Certificado Digital con QR y Alta Curada (`80.0s – 96.0s`)
- **Say**: "Cada retiro genera al instante un Certificado Digital público con código QR. Cualquier auditor o cliente puede escanearlo y verificar en cinco segundos la transacción en Stellar Expert y la imagen satelital original, sin tener que confiar en nuestra palabra. Y ningún predio entra a ciegas: exigimos validación dominial y cruce previo con el Radar del Chaco."
- **Show**: Left: High-craft representation of Dosel's verifiable certificate `/#/certificado/0` (`500 tCO₂e retiradas`, `Empresa Demo SA - huella 2026`, `IMPEN1 · Lote 2026-03`, scene `S2B_MSIL2A_20260309`, clickable Stellar Expert hash, scannable QR code). Right: 4-step Curated Parcel Onboarding (`Solicitud Catastral` → `Auditoría Dominial + Radar del Chaco` → `Firma Admin Soroban` → `Monitoreo Continuo`).
- **Motion**: Blueprint `certificate-reveal` · certificate elevation + QR scan-line shimmer + staggered onboarding steps · Exit: `slide` transition at 96.0s.

### 07 — Modelo de Negocio Sostenible y Honestidad Técnica (`96.0s – 110.0s`)
- **Say**: "Nuestro modelo de negocio alinea los incentivos desde el código: registrar el bosque no tiene costo de entrada para el productor. Dosel cobra únicamente una comisión atómica del cinco al ocho por ciento al concretarse la compensación, enviando más del noventa y dos por ciento del valor directo a quien conserva el monte, en segundos y sin intermediarios."
- **Show**: Economic flow & value distribution chart (`0 USD / 0 XLM` onboarding barrier for forest owners; atomic `buy_and_retire` split: `92%–95%` direct to producer wallet in `< 5s` via Stellar SAC + `5%–8%` `fee_bps` to Dosel protocol sustainability) alongside the technical honesty & Mainnet/Instawards roadmap panel.
- **Motion**: Blueprint `metric-bars-and-roadmap` · animated percentage bar fill (`95%` / `5%`) + staggered roadmap cards · Exit: `fade` transition at 110.0s.

### 08 — Cierre: «Cada tonelada tiene un satélite detrás» (`110.0s – 120.0s`)
- **Say**: "En Dosel, conservar el bosque nativo deja de ser una promesa en papel. Cada tonelada tiene un satélite detrás. Probá hoy la plataforma en vivo sobre Stellar Testnet."
- **Show**: Full-bleed atmospheric canopy + satellite horizon lockup with Dosel emblem (`assets/logo-mark.svg`), headline *"Cada tonelada tiene un satélite detrás."*, live URL pill `https://ideathon-henna.vercel.app/`, and verified Stellar Testnet contract IDs (`GreenTon: CD4WZAWP…JS25K7Q` · `Mercado: CCVSHRV3…VOJTYDD`).
- **Motion**: Blueprint `brand-lockup-finale` · emblem scale & glow + kinetic headline reveal + steady hold to 120.0s.
