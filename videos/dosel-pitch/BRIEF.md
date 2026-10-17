---
workflow: general-video
flow: automation
storyboard: no
length: 120s
aspect: 1920x1080
tone: Dark-forest satellite telemetry + high-craft product walkthrough · editorial rigor, organic chlorophyll lime accents, crisp on-chain verification proof
music: Atmospheric cinematic electronic pulse at 100 BPM — warm deep forest synth pads, subtle orbital sonar pings, voiceover-friendly EQ curve (-18 dBFS)
voiceover: Team live voiceover recording guided by synchronized lower-third captions and time-coded 2:00 script (SCRIPT.md & docs/pitch/guion-video-2min.md)
language: es
source: https://ideathon-henna.vercel.app/
created: 2026-10-17T05:55:00Z
updated: 2026-10-17T05:55:00Z
---

## Key Message
Dosel turns native forest conservation in the Gran Chaco into verifiable carbon credits on Stellar (Soroban), backed by ESA Sentinel-2 multispectral telemetry and independent 10m land-cover cross-checks, where buying is atomically retiring ("Comprar es compensar") and every retired ton emits a public QR certificate verifiable in 5 seconds without trusting Dosel.

## Must Include
- Real deforestation crisis numbers from `docs/validacion.md` (`119.886 ha` cleared in 2024, `210.702 ha` lost in 2025, `+7.000.000 ha` lost in Gran Chaco) and why paper PDF carbon credits fail.
- Live application walkthrough of `https://ideathon-henna.vercel.app/`:
  - **Portada**: 4-step architecture (`01 Sentinel-2` → `02 Oráculo` → `03 Soroban` → `04 Stellar`) and live Testnet metrics (`61.239 GTON` in circulation, `500 tCO₂e` retired).
  - **Predios (Active)**: `IMPEN1` (Impenetrable, `1.380 ha`, NDVI `0,768 → 0,769`, `28.181 GTON`) & `CHACO1` (`1.370 ha`, NDVI `0,771 → 0,773`) with real Sentinel-2 imagery (`sat-impen.png`).
  - **Predios (Frozen & Dual-Signal Validation)**: `TACOP1` (`996 ha`, NDVI `0,814 → 0,612`, `-0,202` drop) triggering automatic Soroban contract freeze (`CONGELADO: NO EMITE`) + `Cobertura del suelo` tab (`app-cobertura.png`) showing Impact Observatory 10m cross-check (`83% cultivos / 17% árboles`) catching both agricultural false positives and herbaceous regrowth false negatives.
  - **Mercado & Atomic Settlement**: Selecting `Oferta 0 (IMPEN1 · 2026-03 a 0,1 XLM/t)`, opening `Confirmar compra y quema` modal (`500 t`, `50 XLM`, `Empresa Demo SA - huella 2026`, `Firmar con Freighter`), and showing `buy_and_retire` paying the forest owner and burning tokens in one atomic transaction.
  - **Verifiable Certificate & Curated Onboarding**: Public certificate `/#/certificado/0` with QR code to Stellar Expert and Sentinel-2 scene + curated parcel onboarding checked against Radar del Chaco.
  - **Sustainable Business Model**: Free onboarding for forest owners, 5–8% atomic market fee (`fee_bps`), 92–95% direct settlement in <5s, and roadmap to Mainnet.
  - **Closing Lockup**: *"Cada tonelada tiene un satélite detrás"*, real Testnet contract IDs (`CD4WZAWP…25K7Q` & `CCVSHRV3…JTYDD`), and `ideathon-henna.vercel.app`.

## Avoid
- Unverified greenwashing claims or generic stock imagery.
- Secondary-market token trading promises (Dosel enforces atomic retirement on purchase).
- Non-glossary terms where `GLOSSARY.md` defines canonical terms (*Predio*, *Lote*, *Línea Base*, *NDVI*, *GreenTon (GTON)*, *Congelamiento*, *Oferta*, *Retiro*, *Oráculo*).
