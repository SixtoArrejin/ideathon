# Guion del video (5:00 máximo)

Tener abierto antes de grabar: la web, Stellar Expert (contratos y transacciones) y Freighter en Testnet. Para la parte de compra hacen falta dos cuentas con XLM de Friendbot: el **dueño** (`owner`, tiene lotes y dos ofertas publicadas) y un **comprador** nuevo.

| Tiempo | Qué se ve | Qué se dice |
|---|---|---|
| 0:00 – 0:30 | Web, portada | "En 2024 se desmontaron unas 120.000 hectáreas de bosque nativo en el norte argentino. Y un crédito de carbono hoy se puede apoyar en un PDF. Dosel lo reemplaza por un satélite: el dosel es la copa del bosque vista desde arriba, justo lo que mide Sentinel-2." |
| 0:30 – 1:15 | Mapa con `IMPEN1`, gráfico de NDVI y panel de cobertura | "Cada predio es un polígono GPS. Un oráculo calcula el NDVI y lo manda a un contrato en Soroban, que emite un lote de GreenTon por predio y período. Acá el NDVI es estable entre 2019 y 2026, y una fuente independiente, el mapa de cobertura de Impact Observatory, confirma que el bosque sigue: 96 % de árboles en 2017, 94 % en 2023." |
| 1:15 – 2:30 | Pestaña `TACOP1` | "Este lote cayó de 0,81 a 0,61 de NDVI. El contrato lo congeló y no emitió ni un token. Pero al cruzar con la cobertura del suelo vimos algo importante: ya era 83 % cultivos en 2017. No es una tala, es estacionalidad agrícola. Es un falso positivo, y la web lo marca y pide que una persona lo revise. También encontramos el caso contrario: bloques donde el bosque se perdió y el NDVI no cayó, porque un cultivo verde también tiene NDVI alto. Por eso la decisión final queda en un auditor." |
| 2:30 – 3:00 | Tabla de evidencia y Stellar Expert | "Cada lote enlaza a la escena satelital exacta y a la transacción. Cualquiera puede verificarlo." |
| 3:00 – 4:00 | Sección Mercado, Freighter con la cuenta compradora | "Una empresa elige una oferta, indica cuántas toneladas y a nombre de quién, y firma. En una sola transacción, el mercado cobra en XLM, le paga al dueño y quema las toneladas del lote. Si el pago falla, no se quema nada." Mostrar la firma, el registro de retiros con el lote de origen y la transacción en Stellar Expert. |
| 4:00 – 4:40 | README, sección limitaciones | "Lo decimos de frente: el oráculo hoy es una sola clave, el factor de toneladas es ilustrativo y no certificado, la segunda señal todavía no está dentro del contrato, no hicimos entrevistas, y estamos en Testnet." |
| 4:40 – 5:00 | Contratos en Stellar Expert | "Dos contratos Soroban propios, Freighter y Stellar SDK. Gracias." |

Si preguntan "¿validaron con usuarios?": la validación fue documental y técnica, sin entrevistas todavía; la técnica incluye un cruce con una fuente independiente que nos hizo corregir nuestro propio caso de demo. Está en `docs/validacion.md`, secciones 3 y 3b.

Si preguntan "¿por qué TACOP1 si no es una tala?": porque muestra el congelamiento funcionando y, sobre todo, muestra por qué hace falta la segunda señal y el auditor. No lo vendemos como desmonte.
