# Spec: mercado de GreenTon con pago en Stellar

> **Reemplazado** por [ADR 0001](../adr/0001-lotes-y-compra-retiro-atomico.md) y por la sección 5 de [`docs/spec-sistema-completo.md`](../spec-sistema-completo.md). Este spec dejaba GreenTon intacto y separaba la compra del retiro. Se conserva como antecedente.

Motivación, diagrama y alineación con Dosel: [`docs/pagos.md`](../pagos.md).

## Problem Statement

El dueño de un predio verificado tiene GTON en su cuenta, pero no tiene forma de venderlos y cobrar dentro del sistema. Si transfiere los GTON a una empresa, el pago ocurre por fuera y nada garantiza que llegue. Para la empresa es el mismo riesgo al revés: paga y confía en que va a recibir los créditos.

## Solution

Un contrato de mercado en Soroban, separado de GreenTon. El dueño publica una oferta con una cantidad de GTON y un precio por tonelada, y el mercado custodia esos GTON. La empresa compra toda la oferta o una parte: en una sola transacción paga al dueño con un activo de Stellar y recibe los GTON en su cuenta. Si cualquiera de las dos partes falla, la transacción entera se revierte. La empresa quema los GTON más tarde con el retiro que ya existe. GreenTon no se modifica ni se redespliega.

## User Stories

1. Como dueño de un predio, quiero publicar una cantidad de mis GTON a un precio por tonelada, para venderlos sin negociar cada operación por fuera.
2. Como dueño, quiero que los GTON publicados queden en custodia del mercado, para que la entrega no dependa de que yo firme en el momento de la compra.
3. Como dueño, quiero recibir el pago en mi cuenta de Stellar en la misma transacción en la que se entregan mis GTON, para no entregar sin cobrar.
4. Como dueño, quiero publicar más de una oferta, para vender a precios distintos.
5. Como dueño, quiero cancelar una oferta y recuperar los GTON que no se vendieron, para usarlos o publicarlos de nuevo.
6. Como dueño, quiero que nadie más pueda cancelar mis ofertas, para que mis GTON en custodia vuelvan solo a mí.
7. Como dueño, quiero que una oferta parcialmente vendida siga abierta con el remanente, para no tener que republicar.
8. Como empresa, quiero ver las ofertas abiertas con vendedor, toneladas disponibles y precio, para elegir a quién comprar.
9. Como empresa, quiero comprar una parte de una oferta, para adquirir solo las toneladas que necesito.
10. Como empresa, quiero ver el total a pagar antes de firmar, para saber cuánto sale de mi cuenta.
11. Como empresa, quiero que el pago y la entrega ocurran juntos o no ocurran, para no pagar sin recibir.
12. Como empresa, quiero recibir los GTON en mi cuenta y no quemarlos en la compra, para compensar cuando corresponda.
13. Como empresa, quiero quemar luego los GTON comprados con el retiro existente, para dejar mi nombre en el registro público de compensación.
14. Como empresa, quiero que la compra falle si pido más toneladas de las disponibles, para no recibir menos de lo que pagué.
15. Como empresa, quiero que la compra falle sin efectos si no tengo saldo suficiente del activo de pago, para no quedar en un estado a medias.
16. Como empresa, quiero firmar la compra con Freighter, la misma billetera que ya uso para retirar.
17. Como auditor o tercero, quiero ver en el explorador cada oferta, compra y cancelación con montos y precio, para verificar las ventas igual que las emisiones.
18. Como operador del sistema, quiero desplegar el mercado sin tocar GreenTon, para conservar el ID de contrato, los predios y los saldos actuales.
19. Como operador, quiero elegir el activo de pago al desplegar, para usar XLM en Testnet y USDC en producción sin cambiar el código.

## Implementation Decisions

- **Contrato nuevo de mercado**, miembro del mismo workspace, con `soroban-sdk` 29. GreenTon queda intacto.
- **Constructor:** dirección del contrato GreenTon y dirección del activo de pago (Stellar Asset Contract). Ambas quedan fijas en el almacenamiento de instancia.
- **Custodia en la publicación.** GreenTon solo permite `transfer` con firma de quien entrega, y no tiene `approve` ni `transfer_from`. Al publicar, el vendedor firma y el mercado mueve los GTON del vendedor a la cuenta del propio contrato. Al comprar, el mercado transfiere desde su saldo y no necesita la firma del vendedor.
- **Interfaz pública:**
  - `list(seller, amount, price_per_ton) -> u32`: exige la firma del vendedor, con `amount > 0` y `price_per_ton > 0`. Transfiere a custodia, crea la oferta y devuelve el ID secuencial.
  - `buy(buyer, offer_id, amount)`: exige la firma del comprador, con oferta abierta y `0 < amount <= disponible`. Transfiere `amount * price_per_ton` del activo de pago del comprador al vendedor, transfiere `amount` GTON del mercado al comprador y descuenta de la oferta. Si queda en cero, la oferta se cierra.
  - `cancel(seller, offer_id)`: exige la firma del vendedor, y ese vendedor tiene que ser el de la oferta. Devuelve el remanente en GTON y cierra la oferta.
  - `get_offer(offer_id) -> Option<Offer>` y `offer_count() -> u32`, ambas de solo lectura.
- **Forma de la oferta:** vendedor, cantidad disponible (`i128`), precio por tonelada (`i128`, en la unidad mínima del activo de pago) y un indicador de abierta.
- **Eventos:** `Listed` (oferta, vendedor, cantidad, precio), `Bought` (oferta, comprador, cantidad, total pagado), `Cancelled` (oferta, cantidad devuelta).
- **Errores:** monto inválido, precio inválido, oferta inexistente, oferta cerrada, cantidad mayor a la disponible y vendedor equivocado.
- **Aritmética:** el total va en `i128`. El perfil release ya tiene `overflow-checks`, así que un desborde aborta la transacción.
- **Atomicidad:** confiada a la transacción de Soroban. Si falla cualquier llamada entre contratos, se revierte todo. No hay estados intermedios.
- **Activo de pago:** XLM nativo vía su SAC en Testnet. Con USDC, el vendedor necesita una trustline previa. Eso queda documentado, no lo valida el contrato.
- **Web:** un panel de mercado junto al de retiro, con la lista de ofertas abiertas, comprar (cantidad y total antes de firmar), publicar y cancelar las propias. La secuencia preparar, firmar con Freighter, enviar y esperar, que hoy vive en el retiro, pasa a ser una función común para las cuatro acciones. La configuración de la web suma el ID del mercado y el del activo de pago.
- **Deploy:** se compila con `stellar contract build`, el ID del SAC de XLM se obtiene con `stellar contract id asset --asset native --network testnet`, y el mercado se despliega con ambos IDs. Después se actualizan la configuración de la web y el README.

## Testing Decisions

- Un buen test mira lo que ve un usuario: saldos de GTON, saldos del activo de pago y el estado de cada oferta según `get_offer`. No inspecciona el almacenamiento interno.
- Se testea el contrato de mercado con tests de host (`cargo test`), con GreenTon y un SAC de prueba registrados en el mismo entorno, y GTON acuñados por el oráculo de la forma habitual.
- Casos mínimos: publicar mueve GTON a custodia; compra completa; compras parciales sucesivas hasta cerrar; cancelación con remanente; comprar más de lo disponible; comprar sin saldo de pago suficiente (sin efectos en ningún saldo); cancelar desde otra cuenta; comprar una oferta cerrada o cancelada.
- Antecedente: los tests de host de GreenTon (setup con `mock_all_auths`, cuentas generadas, cliente del contrato y aserciones sobre saldos y suministro).
- La web no suma tests automáticos. Se verifica con `npm run build` en la CI existente y con una compra manual en Testnet.

## Out of Scope

- Cambios a GreenTon o un redeploy.
- Quemar en el momento de la compra.
- Procedencia por predio de los GTON vendidos (GTON es fungible).
- Bloquear la venta de GTON de un predio congelado.
- Rampa de XLM o USDC a pesos o a una cuenta bancaria.
- Comisión de plataforma, subastas, precio de referencia, órdenes de compra o libro de órdenes.
- Mainnet.

## Further Notes

- Mientras la oferta está abierta, los GTON no figuran en la cuenta del dueño sino en la del mercado. La web tiene que mostrarlo para que el saldo no parezca perdido.
- La entrega de la hackathon cierra el 16/10 a las 19:00 y no admite commits posteriores. Este spec no forma parte de esa entrega.
