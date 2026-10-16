# Dosel

*Dosel* es la copa del bosque vista desde arriba, lo que mide el satélite. Créditos de carbono de **bosque nativo** del NEA/Gran Chaco, **verificados por satélite** y emitidos/retirados en **Stellar (Soroban)**.
Proyecto para el IDEATHON Neatech 2026 · Stellar Track.

**No confiamos en la palabra del dueño del campo.** Un oráculo calcula el NDVI real de Sentinel-2 sobre el polígono GPS del predio
y solo con ese dato el contrato emite GreenTon (1 GTON = 1 tCO₂e). Si el NDVI cae (tala, incendio), el contrato **congela el predio y frena la emisión**.
Quien compensa su huella **retira (quema)** los tokens: nadie puede revenderlos y el registro es público.

## Qué se construyó (declaración de originalidad)

Todo el código de este repositorio se escribió durante la hackathon (repo nuevo, sin código previo; lo único previo son los documentos de `docs/` y las skills de agentes).

## Uso de IA (declarado)

Construido con **Claude Code** (Anthropic): contrato, oráculo, frontend, documentación e investigación. Las decisiones de alcance fueron del equipo.

## Stack de Stellar usado

**Soroban** (contrato en Rust, `soroban-sdk 29`, constructor, eventos, almacenamiento persistente) · **Stellar SDK** (TypeScript) · **Freighter** · **Soroban RPC** · Stellar CLI · Stellar Expert.

## Datos on-chain (Testnet)

GreenTon v2 (lotes por predio y período) y el contrato de mercado todavía no están desplegados: los pasos están en [`DEPLOY.md`](DEPLOY.md). Lo que sigue es la versión 1, la que se presentó en la hackathon. Su evidencia satelital está archivada en `web/public/verifications.v1.json`.

- **Contrato v1:** [`CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG`](https://stellar.expert/explorer/testnet/contract/CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG)
- **Deploy tx:** [`92b4b8ea…8805b3`](https://stellar.expert/explorer/testnet/tx/92b4b8ea31272159b4be552208a00cd045a5915d333367d23a3d9584088805b3)
- **Cuentas:** admin `GBUV6IJFW22PVJYBU2PNYNE3OLGC6BMYCTGTYYHD6LGZ4WUBXGTVB2ZY` · oráculo `GAD6MXY72PSLIMCSY2U5SCMVEXLWKW6DXP6U3BGFWYMVFIEMVQNMI2QL` · propietario `GC3OLPSBNRCMPEQUIPWIFCU2K5BOTDZD7EZUSI3AXSAVJ5YQM5K7WAQD`

| Acción | Tx |
|---|---|
| IMPEN1 · 2019 (línea base) NDVI 0,768 → emite | [f196f947…](https://stellar.expert/explorer/testnet/tx/f196f947889a919742a63f2d780345377352c12095bfcbd43c5f510f36bf44ec) |
| IMPEN1 · 2026 NDVI 0,769 → emite | [f367cafc…](https://stellar.expert/explorer/testnet/tx/f367cafccb188c623d41ff2874710c6f3859dae0dc279395f8f4ec6b0feec2a2) |
| CHACO1 · 2019 → emite | [cbc0bb53…](https://stellar.expert/explorer/testnet/tx/cbc0bb533df8599137b835b74f9f94a4159ba4b7ed35a4b54d0985182104e53b) |
| CHACO1 · 2026 → emite | [acf4e2c5…](https://stellar.expert/explorer/testnet/tx/acf4e2c55f8e729b501767535fa2698c9ab42819848d3b964c38e27df5b9acdd) |
| TACOP1 · 2019 NDVI 0,814 → emite | [329e3a04…](https://stellar.expert/explorer/testnet/tx/329e3a0420e33ee42f094635627445639979181330a5c356ef7118b64b84bbc7) |
| **TACOP1 · 2026 NDVI 0,612 → CONGELA, emisión 0** | [cc1170f6…](https://stellar.expert/explorer/testnet/tx/cc1170f6ee4781e030030e3a10397da0789010acf36ea9f4f73bebe707a03134) |
| Retiro (quema) de 1.000 GTON por "Empresa Demo SA" | [d6155183…](https://stellar.expert/explorer/testnet/tx/d61551837219af213a6de4712112de50fb57b33754a0af615e0d22a7b1a7302f) |

## Arquitectura

```
Sentinel-2 L2A (Planetary Computer, STAC)
        │  NDVI medio del bbox (oracle/ndvi.py)
        ▼
Oráculo (Python) ──firma──► GreenTon v2 ◄──firma── Freighter (propietario)
                              • register_parcel     • submit_verification (solo oráculo)
                              • transfer / retire por lote   • unfreeze (solo admin/auditor)
                                     ▲
                                     │ transfer (custodia) · retire (quema)
                              Mercado ◄──firma── Freighter (propietario: list/cancel · empresa: buy_and_retire)
                                     │ transfer del pago (SAC de XLM / USDC)
                                     ▼
                          Web (Vite + React + Stellar SDK) lee el estado por RPC
```

Reglas de GreenTon (`contracts/greenton/src/lib.rs`):
- Solo el oráculo emite, **una vez por predio y período**. Cada emisión crea un **lote** (predio, período).
- Saldos, transferencias y retiros son **por lote**: cada tonelada retirada apunta al predio y a la verificación de origen.
- NDVI < 0,400 **o** caída > 0,150 respecto de la línea base ⇒ el predio se **congela** y no emite lotes nuevos.
- `retire` quema, reduce el suministro y guarda quién compensó y de qué lote; `unfreeze` lo hace un admin (auditor humano).

Reglas del mercado (`contracts/market/src/lib.rs`):
- Publicar una oferta pone el lote en custodia del mercado.
- `buy_and_retire` paga al vendedor y quema las toneladas a nombre del beneficiario **en una sola transacción**. Si falla el pago, no se quema nada.
- Solo el vendedor cancela, y recupera el remanente.

Decisiones: [ADR 0001](docs/adr/0001-lotes-y-compra-retiro-atomico.md).

## Cómo correrlo

Requisitos: Rust + `wasm32v1-none`, [Stellar CLI](https://developers.stellar.org/docs/tools/cli), Node 20+, Python 3.11+.

```sh
# Contrato
cargo test                       # greenton + market
stellar contract build           # -> target/wasm32v1-none/release/{greenton,market}.wasm

# Deploy en testnet (detalle en DEPLOY.md)
stellar keys generate admin --network testnet --fund   # idem: oracle, owner
stellar contract deploy --wasm target/wasm32v1-none/release/greenton.wasm --source admin \
  --network testnet --alias greenton -- --admin $(stellar keys address admin) --oracle $(stellar keys address oracle)
stellar contract deploy --wasm target/wasm32v1-none/release/market.wasm --source admin \
  --network testnet --alias market -- --greenton <ID que imprimió el deploy de greenton> \
  --payment_asset $(stellar contract id asset --asset native --network testnet)

# Oráculo
python3 -m venv oracle/.venv && oracle/.venv/bin/pip install pystac-client planetary-computer rasterio numpy
cd oracle
.venv/bin/python run.py register
.venv/bin/python run.py verify TACOP1 202603 "2026-02-01/2026-03-31"

# Web
cd web && npm install
VITE_GREENTON_ID=C... VITE_MARKET_ID=C... npm run dev
```

Para publicar, comprar o retirar desde la web, usar Freighter en **Testnet**. Para comprar, la cuenta necesita XLM (Friendbot).

## Limitaciones (dichas de frente)

- **Oráculo de clave única**: centralizado en esta versión. Siguiente paso: multi-oráculo/umbral y auditores certificados.
- **Factor NDVI→tCO₂e simplificado e ilustrativo** (5,5 tCO₂e/ha/año a vigor máximo, escalado por NDVI). **No es una metodología certificada** (Verra/IPCC).
- Los "períodos" 2019 y 2026 usan la misma estación (feb–mar) para comparar; 2019 funciona como línea base histórica, no como siete años de emisión real.
- TACOP1 se eligió por su caída de NDVI dentro de la zona donde Greenpeace documentó desmontes; **no está confirmado como desmonte ilegal**.
- **Sin entrevistas a usuarios.** La validación es documental y técnica: ver [`docs/validacion.md`](docs/validacion.md).
- **Congelar no bloquea lotes viejos**: las toneladas emitidas antes de la caída se pueden seguir ofertando. La web lo advierte en la oferta.
- GreenTon v2 no implementa la interfaz estándar de token (SEP-41): las billeteras genéricas no muestran los saldos por lote.
- Testnet únicamente.
