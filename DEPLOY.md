# Guía de despliegue y entrega

Para quien haga el deploy y la entrega final. Todo lo de abajo ya está probado en local salvo el deploy de la web.

## 1. Verificar que todo funciona en local

```sh
cargo test                                            # 7 tests del contrato
python3 -m unittest discover -s oracle/tests          # tests del oráculo (con el venv activo o con oracle/.venv/bin/python)
cd web && npm install && npm run build                # tiene que terminar sin errores
npm run dev                                           # http://localhost:5173
```

En la web tienen que verse: 3 predios en el mapa satelital, 60.739 GTON en circulación, 1.000 retiradas y `TACOP1` en rojo como congelado.

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
- [ ] Subir en [stellarapex.org](https://stellarapex.org): repo, link de la demo, **ID del contrato**, hash de una transacción y cuentas (están en el README), video, deck PDF (`docs/pitch/Quebracho-deck.pdf`) y evidencia de validación (`docs/validacion.md`).
- [ ] Subir con al menos 30 minutos de anticipación. **No pushear commits después del cierre**: no se consideran.

## 4. Probar Retirar con Freighter

1. Instalar Freighter, cambiar a **Testnet**.
2. Importar la cuenta `owner` con su clave secreta de testnet (ver sección de abajo).
3. En la web: Conectar Freighter, poner cantidad y nombre, Retirar y quemar, firmar.

La clave secreta de `owner` vive en la máquina de quien hizo el setup: `stellar keys show owner`. Es una cuenta de testnet sin valor. Si se decide publicarla, ponerla en el README **solo cuando el repo sea público** y entendiendo que cualquiera podrá mover esos GTON.

## 5. Redeploy del contrato (solo si hace falta)

Cambiar el contrato implica un **nuevo ID**: hay que actualizar `web/src/config.ts`, el README y la entrega, y volver a correr `oracle/run.py register` y `verify`. Si el contrato actual funciona, no tocarlo.
