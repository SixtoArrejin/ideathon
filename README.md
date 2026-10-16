# Quebracho

*Quebracho* viene de «quiebra-hacha», el árbol emblema del Gran Chaco. Créditos de carbono de **bosque nativo** del NEA/Gran Chaco, **verificados por satélite** y emitidos/retirados en **Stellar (Soroban)**.
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

- **Contrato:** [`CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG`](https://stellar.expert/explorer/testnet/contract/CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG)
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
Oráculo (Python) ──firma──► Contrato Soroban GreenTon ◄──firma── Freighter (propietario / empresa)
                              • register_parcel     • submit_verification (solo oráculo)
                              • retire (quema)      • unfreeze (solo admin/auditor)
                                     ▲
                          Web (Vite + React + Stellar SDK) lee el estado por RPC
```

Reglas del contrato (`contracts/greenton/src/lib.rs`):
- Solo el oráculo emite, **una vez por predio y período** (no se vende el mismo período dos veces).
- NDVI < 0,400 **o** caída > 0,150 respecto de la línea base ⇒ el predio se **congela** y no emite.
- `retire` quema, reduce el suministro y guarda quién compensó; `unfreeze` lo hace un admin (auditor humano).

## Cómo correrlo

Requisitos: Rust + `wasm32v1-none`, [Stellar CLI](https://developers.stellar.org/docs/tools/cli), Node 20+, Python 3.11+.

```sh
# Contrato
cargo test                       # 7 tests
stellar contract build           # -> target/wasm32v1-none/release/greenton.wasm

# Deploy en testnet
stellar keys generate admin --network testnet --fund   # idem: oracle, owner
stellar contract deploy --wasm target/wasm32v1-none/release/greenton.wasm --source admin \
  --network testnet --alias greenton -- --admin $(stellar keys address admin) --oracle $(stellar keys address oracle)

# Oráculo
python3 -m venv oracle/.venv && oracle/.venv/bin/pip install pystac-client planetary-computer rasterio numpy
cd oracle
.venv/bin/python run.py register
.venv/bin/python run.py verify TACOP1 202603 "2026-02-01/2026-03-31"

# Web
cd web && npm install && npm run dev      # editar src/config.ts con tu CONTRACT_ID
```

Para retirar desde la web, usar Freighter en **Testnet** con una cuenta que tenga GTON.

## Limitaciones (dichas de frente)

- **Oráculo de clave única**: centralizado en esta versión. Siguiente paso: multi-oráculo/umbral y auditores certificados.
- **Factor NDVI→tCO₂e simplificado e ilustrativo** (5,5 tCO₂e/ha/año a vigor máximo, escalado por NDVI). **No es una metodología certificada** (Verra/IPCC).
- Los "períodos" 2019 y 2026 usan la misma estación (feb–mar) para comparar; 2019 funciona como línea base histórica, no como siete años de emisión real.
- TACOP1 se eligió por su caída de NDVI dentro de la zona donde Greenpeace documentó desmontes; **no está confirmado como desmonte ilegal**.
- **Sin entrevistas a usuarios.** La validación es documental y técnica: ver [`docs/validacion.md`](docs/validacion.md).
- Testnet únicamente.
