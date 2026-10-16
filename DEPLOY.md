# Guía de despliegue y entrega

Para quien haga el deploy y la entrega final. Todo lo de abajo ya está probado en local salvo el deploy de la web.

## 1. Verificar que todo funciona en local

```sh
cargo test                                            # tests de greenton y market
python3 -m unittest discover -s oracle/tests          # tests del oráculo (con el venv activo o con oracle/.venv/bin/python)
cd web && npm install && npm run build                # tiene que terminar sin errores
npm run dev                                           # http://localhost:5173
```

Con la demo v1 de la hackathon se veían: 3 predios en el mapa satelital, 60.739 GTON en circulación, 1.000 retiradas y `TACOP1` en rojo como congelado. La web actual necesita GreenTon v2 y el mercado desplegados (sección 5). Sin `VITE_GREENTON_ID` y `VITE_MARKET_ID`, muestra un aviso de configuración.

## 2. Desplegar la web (estática)

La web es un build estático de Vite: `web/dist`. Cualquier hosting estático sirve.

**Vercel (recomendado):**
```sh
cd web
npx vercel login
npx vercel --prod        # root = web, build = npm run build, output = dist
```
Importante: al preguntar si se vincula un repositorio de Git, responder según se prefiera; no es necesario para que funcione.

**Netlify:** `npx netlify deploy --dir=dist --prod` después de `npm run build`.

La web lee todo directo del RPC de Stellar Testnet. No necesita variables de entorno ni backend. `public/verifications.json` trae la evidencia satelital (escenas y hashes de transacción).

## 3. Antes de la entrega (cierre viernes 16/10, 19:00)

- [ ] Hacer **público** el repositorio de GitHub (la consigna lo exige) y revisar que no haya claves: `git log -p | grep -i secret` no debe mostrar claves reales.
- [ ] Pegar la URL de la demo en el `README.md` (sección "Demo").
- [ ] Probar la demo desde un navegador limpio: el mapa carga, el contrato se lee, **Retirar** funciona con Freighter en Testnet.
- [ ] Grabar el video (guion en `docs/pitch/guion-video.md`) y subirlo a YouTube o Drive con acceso público.
- [ ] Subir en [stellarapex.org](https://stellarapex.org): repo, link de la demo, **ID del contrato**, hash de una transacción y cuentas (están en el README), video, deck PDF (`docs/pitch/Dosel-deck.pdf`) y evidencia de validación (`docs/validacion.md`).
- [ ] Subir con al menos 30 minutos de anticipación. **No pushear commits después del cierre**: no se consideran.

## 4. Probar Retirar con Freighter

1. Instalar Freighter, cambiar a **Testnet**.
2. Importar la cuenta `owner` con su clave secreta de testnet (ver sección de abajo).
3. En la web: Conectar Freighter, poner cantidad y nombre, Retirar y quemar, firmar.

La clave secreta de `owner` vive en la máquina de quien hizo el setup: `stellar keys show owner`. Es una cuenta de testnet sin valor. Si se decide publicarla, ponerla en el README **solo cuando el repo sea público** y entendiendo que cualquiera podrá mover esos GTON.

## 5. Deploy de GreenTon v2 y del mercado

GreenTon v2 (lotes) es un contrato nuevo: **nuevo ID**, y los predios se vuelven a registrar y verificar. Los GTON del contrato v1 no se migran. Ver [ADR 0001](docs/adr/0001-lotes-y-compra-retiro-atomico.md).

La web de este repo ya habla con v2. **No publicarla** con la demo v1 de la hackathon: no tiene las funciones por lote.

```sh
# 1. Compilar y probar
cargo test
stellar contract build

# 2. GreenTon v2 (anotar el ID que imprime)
stellar contract deploy --wasm target/wasm32v1-none/release/greenton.wasm --source admin \
  --network testnet --alias greenton -- \
  --admin $(stellar keys address admin) --oracle $(stellar keys address oracle)

# 3. SAC de XLM nativo (activo de pago en Testnet)
stellar contract id asset --asset native --network testnet

# 4. Mercado (anotar el ID que imprime)
stellar contract deploy --wasm target/wasm32v1-none/release/market.wasm --source admin \
  --network testnet --alias market -- --greenton <ID de GreenTon v2> --payment_asset <ID del SAC>

# 5. Predios y verificaciones (con el venv del oráculo)
cd oracle
.venv/bin/python run.py register
.venv/bin/python run.py verify IMPEN1 201903 "2019-02-01/2019-03-31"
.venv/bin/python run.py verify IMPEN1 202603 "2026-02-01/2026-03-31"
# idem CHACO1 y TACOP1
```

`run.py` usa el alias `greenton` (o `GREENTON_CONTRACT`) y escribe la evidencia en `web/public/verifications.json`, que arranca vacío. La de v1 queda en `verifications.v1.json`.

6. **Web:** definir `VITE_GREENTON_ID` y `VITE_MARKET_ID` (en `web/.env.local` o en las variables del hosting). `VITE_PAYMENT_ASSET_ID` es opcional: por defecto es el SAC de XLM en Testnet. Sin los dos IDs, la web muestra un aviso de configuración.
7. **Prueba manual:**
   1. Con Freighter en la cuenta `owner`, en **Mi cuenta**, publicar una oferta de un lote de IMPEN1.
   2. Con otra cuenta fondeada por Friendbot, en **Mercado**, comprar y quemar una parte.
   3. Comprobar que el XLM llegó al dueño, que el retiro figura con el lote IMPEN1 y que el suministro bajó.
8. Actualizar el README con los IDs y los hashes nuevos.
