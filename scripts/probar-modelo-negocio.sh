#!/usr/bin/env bash
# Prueba en Testnet el modelo de negocio (registro solo por el admin y comisión de plataforma)
# con contratos de PRUEBA propios. No toca los contratos oficiales ni sus IDs.
#
# Requisitos: stellar CLI, Rust con wasm32v1-none y las cuentas locales admin, oracle, owner y buyer.
# Uso: scripts/probar-modelo-negocio.sh [fee_bps]     (500 = 5 %, tope 1000)
set -uo pipefail
cd "$(dirname "$0")/.."
FEE_BPS="${1:-500}"
NET=testnet
PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (esperado: $3, obtenido: $2)"; fi; }
bal() { curl -s "https://horizon-testnet.stellar.org/accounts/$1" | python3 -c "import sys,json;print([b['balance'] for b in json.load(sys.stdin)['balances'] if b['asset_type']=='native'][0])"; }
inv() { local src="$1" id="$2"; shift 2; stellar contract invoke --id "$id" --source "$src" --network $NET -- "$@" 2>&1; }

echo "1) Compilando los contratos con el código actual…"
stellar contract build >/dev/null 2>&1 || { echo "falló la compilación"; exit 1; }

echo "2) Cuenta de tesorería (recibe la comisión)…"
stellar keys address tesoreria >/dev/null 2>&1 || stellar keys generate tesoreria --network $NET --fund >/dev/null 2>&1
ADMIN=$(stellar keys address admin); ORACLE=$(stellar keys address oracle)
OWNER=$(stellar keys address owner); BUYER=$(stellar keys address buyer); TREAS=$(stellar keys address tesoreria)
SAC=$(stellar contract id asset --asset native --network $NET)

echo "3) Desplegando contratos de prueba (alias *-negocio)…"
stellar contract alias remove greenton-negocio >/dev/null 2>&1; stellar contract alias remove market-negocio >/dev/null 2>&1
GT=$(stellar contract deploy --wasm target/wasm32v1-none/release/greenton.wasm --source admin --network $NET --alias greenton-negocio -- --admin "$ADMIN" --oracle "$ORACLE" 2>&1 | tail -1)
MK=$(stellar contract deploy --wasm target/wasm32v1-none/release/market.wasm --source admin --network $NET --alias market-negocio -- --greenton "$GT" --payment_asset "$SAC" --treasury "$TREAS" --fee_bps "$FEE_BPS" 2>&1 | tail -1)
echo "   GreenTon de prueba: $GT"; echo "   Mercado de prueba:  $MK"
[ ${#GT} -eq 56 ] && [ ${#MK} -eq 56 ] || { echo "falló el despliegue"; exit 1; }

echo "4) Configuración del mercado"
check "comisión (puntos básicos)" "$(inv owner "$MK" fee_bps | tail -1 | tr -d '"')" "$FEE_BPS"
check "tesorería" "$(inv owner "$MK" treasury | tail -1 | tr -d '"')" "$TREAS"

echo "5) Registro de predios: solo el admin (se registran los tres predios que conoce la web)"
if inv owner "$GT" register_parcel --owner="$OWNER" --parcel=IMPEN1 --hectares=2781 --bbox="-60.95,-25.35,-60.9,-25.3" >/dev/null; then bad "el propietario NO debería poder registrar su predio"; else ok "el propietario no puede registrar (exige la firma del admin)"; fi
inv admin "$GT" register_parcel --owner="$OWNER" --parcel=IMPEN1 --hectares=2781 --bbox="-60.95,-25.35,-60.9,-25.3" >/dev/null && ok "el admin registra IMPEN1 a nombre del propietario" || bad "el admin no pudo registrar"
inv admin "$GT" register_parcel --owner="$OWNER" --parcel=CHACO1 --hectares=2747 --bbox="-59.62,-26.8,-59.57,-26.75" >/dev/null && ok "el admin registra CHACO1" || bad "no se registró CHACO1"
inv admin "$GT" register_parcel --owner="$OWNER" --parcel=TACOP1 --hectares=996 --bbox="-61.8,-26.0,-61.77,-25.97" >/dev/null && ok "el admin registra TACOP1" || bad "no se registró TACOP1"

echo "6) Emisión por el oráculo (datos de PRUEBA, no son mediciones reales)"
check "toneladas emitidas" "$(inv oracle "$GT" submit_verification --parcel=IMPEN1 --period=202603 --ndvi_milli=769 --tco2e=1000 | tail -1 | tr -d '"')" "1000"

echo "7) El propietario publica 1000 t a 1 XLM por tonelada"
inv owner "$MK" list --seller="$OWNER" --parcel=IMPEN1 --period=202603 --amount=1000 --price_per_ton=10000000 >/dev/null && ok "oferta publicada" || bad "no se pudo publicar"

O0=$(bal "$OWNER"); T0=$(bal "$TREAS")
echo "8) El comprador compra y quema 100 t (paga 100 XLM)"
inv buyer "$MK" buy_and_retire --buyer="$BUYER" --offer_id=0 --amount=100 --beneficiary="Prueba de comision" >/dev/null && ok "compra y quema atómica" || bad "falló la compra"
O1=$(bal "$OWNER"); T1=$(bal "$TREAS")
EXP_FEE=$(python3 -c "print(100*$FEE_BPS/10000)"); EXP_SELL=$(python3 -c "print(100-100*$FEE_BPS/10000)")
check "el propietario recibió (XLM)" "$(python3 -c "print(round($O1-$O0,7))")" "$(python3 -c "print(round($EXP_SELL,7))")"
check "la tesorería recibió la comisión (XLM)" "$(python3 -c "print(round($T1-$T0,7))")" "$(python3 -c "print(round($EXP_FEE,7))")"
P=$(inv buyer "$MK" get_purchase --purchase_id=0 | tail -1)
echo "   compra registrada: $P"
check "retiradas en el contrato" "$(inv buyer "$GT" total_retired | tail -1 | tr -d '"')" "100"

echo
echo "Resultado: $PASS pasaron, $FAIL fallaron."
echo
echo "Para ver el modelo en la web, sin tocar producción:"
echo "  cd web && VITE_GREENTON_ID=$GT VITE_MARKET_ID=$MK npm run dev"
echo "Qué ver en esa web local: Predios (3 registrados, IMPEN1 con una emisión de prueba), Mercado (oferta de 900 t restantes)"
echo "y el certificado del retiro generado:  http://localhost:5173/#/certificado/0"
echo "Ojo: la tabla de evidencia satelital sigue mostrando la de los contratos oficiales; estos son datos de prueba."
[ "$FAIL" -eq 0 ]
