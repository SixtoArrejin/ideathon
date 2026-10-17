# Dosel

*Dosel* es la copa del bosque vista desde arriba, lo que mide el satélite. Créditos de carbono de **bosque nativo** del NEA/Gran Chaco, **verificados por satélite** y emitidos/retirados en **Stellar (Soroban)**.
Proyecto para el IDEATHON Neatech 2026 · Stellar Track.

**Demo en vivo:** [ideathon-henna.vercel.app](https://ideathon-henna.vercel.app) · funciona sobre Stellar Testnet; para comprar, publicar o retirar hace falta [Freighter](https://www.freighter.app) en Testnet.

**No confiamos en la palabra del dueño del campo.** Un oráculo calcula el NDVI real de Sentinel-2 sobre el polígono GPS del predio
y solo con ese dato el contrato emite GreenTon (1 GTON = 1 tCO₂e). Si el NDVI cae, el contrato **congela el predio y frena la emisión**, y la web contrasta esa señal con un mapa de cobertura del suelo independiente.
Quien compensa su huella **retira (quema)** los tokens: nadie puede revenderlos y el registro es público.

## Qué se construyó (declaración de originalidad)

Todo el código de este repositorio se escribió durante la hackathon (repo nuevo, sin código previo; lo único previo son los documentos de `docs/` y las skills de agentes).

## Uso de IA (declarado)

Construido con **Claude Code** (Anthropic): contrato, oráculo, frontend, documentación e investigación. Las decisiones de alcance fueron del equipo.

## Stack de Stellar usado

**Soroban** (contrato en Rust, `soroban-sdk 29`, constructor, eventos, almacenamiento persistente) · **Stellar SDK** (TypeScript) · **Freighter** · **Soroban RPC** · Stellar CLI · Stellar Expert.

## Datos on-chain (Testnet)

> **Código de lo desplegado:** el fuente exacto de los dos contratos de abajo es el del tag [`contratos-desplegados-testnet`](https://github.com/SixtoArrejin/ideathon/tree/contratos-desplegados-testnet). `main` suma cambios posteriores (registro de predios solo por el admin y comisión de plataforma) que **todavía no están desplegados**.

- **GreenTon:** [`CD4WZAWPGFZL2GUOOWYNSPG3CGNO6PA6QJ2UP5PCCOTBQK3KGJS25K7Q`](https://stellar.expert/explorer/testnet/contract/CD4WZAWPGFZL2GUOOWYNSPG3CGNO6PA6QJ2UP5PCCOTBQK3KGJS25K7Q) · deploy [fc7cc8e0…](https://stellar.expert/explorer/testnet/tx/fc7cc8e023414ae301d0b290985e219447f08272af97b1d48fa77191e2d0352c)
- **Mercado:** [`CCVSHRV373O3QPIJL55LYQK6OGLLYIPMMD35KDQDY7AXHB7VLVOJTYDD`](https://stellar.expert/explorer/testnet/contract/CCVSHRV373O3QPIJL55LYQK6OGLLYIPMMD35KDQDY7AXHB7VLVOJTYDD) · deploy [00d7de79…](https://stellar.expert/explorer/testnet/tx/00d7de791c0a8a821aad800cb02d28155c393629243d88b51a68f8efca01dbbb)
- **Activo de pago:** XLM nativo vía su SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **Cuentas:** admin `GBUV6IJFW22PVJYBU2PNYNE3OLGC6BMYCTGTYYHD6LGZ4WUBXGTVB2ZY` · oráculo `GAD6MXY72PSLIMCSY2U5SCMVEXLWKW6DXP6U3BGFWYMVFIEMVQNMI2QL` · propietario `GC3OLPSBNRCMPEQUIPWIFCU2K5BOTDZD7EZUSI3AXSAVJ5YQM5K7WAQD` · comprador de la demo `GAUJHWH757JYECRFIDJYU4UEPZCTJ7JHR2BZFSR3DEUSCMEFW7E5RXIT` · comprador desde la web con Freighter `GCGUEI3ECPOBNJI5DHI4GO3RHI3PYIR5SVMOM4BEYGHJPBTOUADACRTN`

| Acción | Tx |
|---|---|
| Alta de los predios IMPEN1, CHACO1 y TACOP1 | [63624b2f…](https://stellar.expert/explorer/testnet/tx/63624b2fe6794ac4c74efedc303035ffb85ebfa0220bf7739db7ec11ec894ecb) · [fd76713d…](https://stellar.expert/explorer/testnet/tx/fd76713dafb0acc1fcbe74ac223527d6eb4d3c14c11aed65da73e362d53ed27f) · [1c07bce2…](https://stellar.expert/explorer/testnet/tx/1c07bce24e2aefd47ba720a42323916eb7d4c88952cb37e18dd5aa10ec5fc79b) |
| IMPEN1 · lote 2019 (línea base) NDVI 0,768 → emite 14.082 | [170c4e1c…](https://stellar.expert/explorer/testnet/tx/170c4e1cb8463c889d9656be0e684918bdb76e90ab5db2ac32aec79b7418a401) |
| IMPEN1 · lote 2026 NDVI 0,769 → emite 14.099 | [13afc813…](https://stellar.expert/explorer/testnet/tx/13afc813e20179548ac99c5dd228c4864d31929f9f1880082b0da9c90ebd32f1) |
| CHACO1 · lote 2019 → emite 13.997 | [e613adff…](https://stellar.expert/explorer/testnet/tx/e613adff9db81927cccca133df7b4ec60574a8ec1d0a4171725aed51a6d18805) |
| CHACO1 · lote 2026 → emite 14.083 | [6a4e274a…](https://stellar.expert/explorer/testnet/tx/6a4e274aa9f5aeae985b0c304331cc53f5f258f8e5315c515a1bd0e0bc65f34e) |
| TACOP1 · lote 2019 NDVI 0,814 → emite 5.478 | [1a3f2470…](https://stellar.expert/explorer/testnet/tx/1a3f2470e5a45f3cec9509c42216e625aa36a2f36d71281a070fa197b0e0239a) |
| **TACOP1 · 2026 NDVI 0,612 → CONGELA, no hay lote nuevo** | [758fc225…](https://stellar.expert/explorer/testnet/tx/758fc225e82a53a76a02246e98b7efbd95a632ad3a44f8f14921766ac13e1079) |
| Oferta 0: 3.000 t del lote IMPEN1 2026 a 0,1 XLM/t, en custodia del mercado | [f9dc5309…](https://stellar.expert/explorer/testnet/tx/f9dc5309ebdb6c4713b4f2c853c19e3dbb492e3e5557f05f6820b6a76a33e598) |
| **Compra y quema atómica:** 500 t de IMPEN1 2026, el comprador paga 50 XLM al dueño y se quema a nombre de "Empresa Demo SA - huella 2026" | [e87f6d61…](https://stellar.expert/explorer/testnet/tx/e87f6d61d8bf51b2b88a28e9ef3cf1e7b2f993c894dfe6359bf9f87cccba4e89) |
| Oferta 1: 2.000 t del lote CHACO1 2026 a 0,2 XLM/t (queda abierta) | [0bdf0799…](https://stellar.expert/explorer/testnet/tx/0bdf0799424934c8a03b1f9f0f4e08a2519b9f4a8a782bbe6ba0386bc956d7f2) |
| **Compra y quema desde la web con Freighter** (cuenta distinta de las del desarrollo): 100 t de IMPEN1 2026, paga 10 XLM, a nombre de «Asymmetric» | [0e0a1f77…](https://stellar.expert/explorer/testnet/tx/0e0a1f77db605b8e1a9ca06e5afa961a6684c15a95d1a818df344a3fec9876cf) |
| Segunda compra y quema desde la web con Freighter: 15 t de IMPEN1 2026, paga 1,5 XLM | [2026bd1a…](https://stellar.expert/explorer/testnet/tx/2026bd1aa86e6ce437c49b4f9d1dc49be95c11facb4a524c2d683ed57f83a27e) |

Estado al 17/10 por la mañana: **61.124 GTON en circulación y 615 retiradas en 3 compras** (500 de la compra de demostración y 115 de las dos compras con Freighter). La web y Stellar Expert muestran siempre el estado actual.

**Primera entrega (archivo).** El contrato de la primera entrega, sin lotes ni mercado, sigue en la red: [`CCNQ7X37…SXMFEMG`](https://stellar.expert/explorer/testnet/contract/CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG). Su evidencia satelital está en `web/public/verifications.v1.json`.

## Arquitectura

```
Sentinel-2 L2A (Planetary Computer, STAC)
        │  NDVI medio del bbox (oracle/ndvi.py)
        ▼
Oráculo (Python) ──firma──► GreenTon ◄──firma── Freighter (propietario)
                              • register_parcel (solo admin)     • submit_verification (solo oráculo)
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

Decisiones: [ADR 0001](docs/adr/0001-lotes-y-compra-retiro-atomico.md) (lotes y compra con quema atómica) y [ADR 0002](docs/adr/0002-alcance-del-modelo-de-negocio.md) (qué se demuestra del modelo de negocio y qué se frena, y por qué).

## Radar y propuesta de predios

La portada de la web suma un **Radar del Chaco**: noticias recientes sobre desmonte y mercado de carbono (`oracle/news.py` las recopila del RSS de Google Noticias y escribe `web/public/news.json`; correrlo de nuevo las actualiza) y la **última pasada de Sentinel-2** sobre cada predio, consultada en vivo al catálogo público de Planetary Computer. El botón «Proponer un predio» abre un issue prellenado en este repositorio con las coordenadas y el contacto, que es cómo se recopilan predios nuevos sin servidor propio.

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
  --payment_asset $(stellar contract id asset --asset native --network testnet) \
  --treasury $(stellar keys address admin) --fee_bps 500      # comisión de plataforma: 500 = 5 % (tope 10 %)

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
- **TACOP1 no es una tala.** Lo elegimos por su caída de NDVI, pero la cobertura del suelo (Impact Observatory) muestra que ya era ~83 % cultivos en 2017: es un **falso positivo** del NDVI por estacionalidad agrícola. Lo conservamos porque ilustra el congelamiento y la necesidad de un auditor.
- **El NDVI solo puede no detectar una tala**: una conversión de monte a cultivo medida en estación húmeda tiene NDVI alto. Documentamos cuatro bloques donde la cobertura muestra pérdida de bosque y el NDVI no cae (`docs/validacion.md`, sección 3b). La segunda señal todavía no está en el contrato.
- **Sin entrevistas a usuarios.** La validación es documental y técnica: ver [`docs/validacion.md`](docs/validacion.md).
- **Congelar no bloquea lotes viejos**: las toneladas emitidas antes de la caída se pueden seguir ofertando. La web lo advierte en la oferta.
- GreenTon no implementa la interfaz estándar de token (SEP-41): las billeteras genéricas no muestran los saldos por lote.
- Testnet únicamente.
