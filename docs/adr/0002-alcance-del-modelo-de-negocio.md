# 0002. Alcance del modelo de negocio: demostrar la comisión en paralelo y frenar el resto

**Estado:** aceptada · octubre 2026

## Contexto

La especificación del modelo de negocio ([`docs/specs/modelo-de-negocio.md`](../specs/modelo-de-negocio.md)) propone tres cobros: una comisión de plataforma en el mercado, un cargo de alta sobre el primer lote y un fondo de reserva del 10 % retenido en cada emisión. Con los rangos que propone la spec (comisión de 5 a 8 %, alta de 3 a 5 %, reserva de 10 %), apilados le quitarían al propietario entre 18 % y 23 % del primer lote, y la spec original no lo decía en ningún lado.

Al mismo tiempo, los contratos oficiales ya estaban desplegados en Testnet y sus IDs y hashes figuran en la entrega de la hackathon. Los contratos no implementan `update_current_contract_wasm`, así que cualquier cambio de lógica exige un despliegue nuevo, con IDs nuevos.

## Decisión

1. **No redesplegar los contratos oficiales.** Los IDs y hashes entregados siguen siendo válidos. El fuente exacto de lo desplegado queda fijado con el tag [`contratos-desplegados-testnet`](https://github.com/SixtoArrejin/ideathon/tree/contratos-desplegados-testnet).
2. **Implementar en el código y demostrar en contratos paralelos** dos piezas: el registro de predios solo por el admin y la comisión de plataforma en `buy_and_retire` (con tope de 10 %, tesorería configurable y redondeo a favor del vendedor). `scripts/probar-modelo-negocio.sh` despliega contratos de prueba propios (`*-negocio`) y verifica el comportamiento con 12 chequeos.
3. **No programar todavía el fondo de reserva ni el cargo de alta.** Exigen cambiar `submit_verification` y definir quién gobierna la cuenta de reserva ante una reversión. Y apilarlos con la comisión penaliza demasiado al productor: primero hay que decidir la política, no escribir código a ciegas.
4. **No construir el formulario privado de alta con KYC (Supabase, almacenamiento privado, validación geográfica).** La web es estática y lee directamente el RPC de Soroban; sumar una base de datos sería otro sistema entero fuera del foco del proyecto. Hoy «Sumar un predio» abre un issue público del repositorio, y el formulario avisa que no se pongan datos privados.
5. **El certificado obtiene el hash de la transacción de retiro de los eventos del RPC**, que se conservan unos 7 días, con `web/public/retirements.json` como respaldo para los retiros oficiales. No hay indexador propio.

## Consecuencias

- La demo oficial y su entrega siguen coherentes. La web detecta si el mercado tiene comisión y solo entonces muestra el desglose antes de firmar.
- `main` contiene código que no coincide con lo desplegado. Lo aclaran el README, `DEPLOY.md` y el tag; la comisión y el registro por admin se prueban con el script, no con los contratos oficiales.
- Pasar a producción exigirá un redeploy, la definición de la política de tarifas y una migración de predios y lotes.
- El hash de un retiro se pierde de la vista pasados unos 7 días si no se agrega a `retirements.json`.
