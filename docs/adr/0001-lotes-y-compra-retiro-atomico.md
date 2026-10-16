# 0001. Lotes por predio y período, y compra-retiro atómica

**Estado:** aceptada · octubre 2026

## Contexto

GreenTon v1 guardaba un único saldo por cuenta. El evento `Minted` decía de qué predio salían las toneladas, pero la primera `transfer` borraba esa relación. Una oferta que dijera "200 t de El Impenetrable", o un certificado con ese predio, prometía una procedencia que el contrato no podía probar.

El spec del sistema además mezclaba dos flujos de compra: el mercado de `docs/pagos.md` (comprar y retirar como actos separados) y un "Buy & Retire" donde la empresa no guarda tokens. Con GreenTon v1, `retire` exige la firma del titular, y en custodia el titular es el mercado, no la empresa.

## Decisión

1. **GreenTon v2 lleva saldos por lote `(predio, período)`.** `transfer` y `retire` reciben el lote. `Retirement` guarda el lote. Implica un redeploy: un ID de contrato nuevo, y volver a registrar y verificar los predios.
2. **Un contrato de mercado aparte custodia el lote desde que se publica la oferta.** `buy_and_retire` cobra al comprador con el SAC del activo de pago, paga al vendedor y llama a `retire` como titular del lote, a nombre del beneficiario, todo en una transacción. No existe compra sin quema.
3. **Firma solo con Freighter.** La plataforma no guarda claves.
4. **El congelamiento no cambia.** `unfreeze` sigue copiando el último NDVI como línea base, y los lotes de un predio congelado se pueden ofertar.

## Consecuencias

- El certificado de retiro apunta a un lote, y ese lote a la verificación satelital y a su escena.
- GreenTon deja de tener la interfaz estándar de token (SEP-41). Las billeteras y los exploradores genéricos no muestran saldos por lote.
- Quien compra no recibe GTON. Para revender o retener toneladas hay que operar con `transfer` fuera del mercado.
- En los retiros del mercado, el titular registrado es la dirección del mercado. El comprador queda en el `Purchase` del mercado y en el evento `Purchased`.
- Las toneladas de un predio que se congela después siguen en venta. La web lo advierte en la oferta.
- `docs/pagos.md` y `docs/specs/mercado-pagos.md` quedan reemplazados por esta decisión.
