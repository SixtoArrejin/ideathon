"""Oráculo GreenTon: calcula NDVI satelital y lo reporta al contrato Soroban.

Uso:
  python run.py register               # registra los predios de parcels.json (firma el dueño)
  python run.py verify <PREDIO> <periodo AAAAMM> <AAAA-MM-DD/AAAA-MM-DD>
"""
import json
import math
import os
import re
import subprocess
import sys

from ndvi import mean_ndvi

HERE = os.path.dirname(os.path.abspath(__file__))
CONTRACT = os.environ.get("GREENTON_CONTRACT", "greenton")
NETWORK = os.environ.get("STELLAR_NETWORK", "testnet")
LOG = os.path.join(HERE, "..", "web", "public", "verifications.json")

# Factor SIMPLIFICADO e ilustrativo (NO es una metodología certificada Verra/IPCC):
# toneladas CO2e/ha/año a vigor máximo, escaladas por el NDVI del predio.
TCO2E_PER_HA_YEAR = 5.5
NDVI_FLOOR, NDVI_CEIL = 0.4, 0.8


def hectares(bbox):
    lon0, lat0, lon1, lat1 = bbox
    mid = math.radians((lat0 + lat1) / 2)
    w = (lon1 - lon0) * 111.32 * math.cos(mid)
    h = (lat1 - lat0) * 110.57
    return round(w * h * 100)


def tco2e(ha, ndvi):
    f = min(max((ndvi - NDVI_FLOOR) / (NDVI_CEIL - NDVI_FLOOR), 0.0), 1.0)
    return int(round(ha * TCO2E_PER_HA_YEAR * f))


def invoke(source, fn, *args):
    cmd = ["stellar", "contract", "invoke", "--id", CONTRACT, "--source", source,
           "--network", NETWORK, "--", fn]
    for k, v in args:
        cmd.append(f"--{k}={v}")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"{fn} falló:\n{r.stderr}")
    tx = re.search(r"/tx/([0-9a-f]{64})", r.stderr)
    return r.stdout.strip(), tx.group(1) if tx else None


def addr(name):
    return subprocess.run(["stellar", "keys", "address", name], capture_output=True,
                          text=True, check=True).stdout.strip()


def load_parcels():
    return {p["id"]: p for p in json.load(open(os.path.join(HERE, "parcels.json")))}


def append_log(entry):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    data = json.load(open(LOG)) if os.path.exists(LOG) else []
    data.append(entry)
    json.dump(data, open(LOG, "w"), indent=2, ensure_ascii=False)


def cmd_register():
    for p in load_parcels().values():
        ha = hectares(p["bbox"])
        out, tx = invoke("owner", "register_parcel", ("owner", addr("owner")),
                         ("parcel", p["id"]), ("hectares", ha),
                         ("bbox", ",".join(map(str, p["bbox"]))))
        print(f"registrado {p['id']} ({ha} ha) tx={tx}")


def cmd_verify(pid, period, date_range):
    p = load_parcels()[pid]
    ha = hectares(p["bbox"])
    s = mean_ndvi(p["bbox"], date_range)
    milli = int(round(s["ndvi"] * 1000))
    amount = tco2e(ha, s["ndvi"])
    out, tx = invoke("oracle", "submit_verification", ("parcel", pid), ("period", period),
                     ("ndvi_milli", milli), ("tco2e", amount))
    print(f"{pid} periodo={period} ndvi={s['ndvi']:.3f} escena={s['scene']} -> emitido={out} tx={tx}")
    append_log({"parcel": pid, "period": int(period), "ndvi": round(s["ndvi"], 3),
                "scene": s["scene"], "scene_date": s["date"], "cloud": s["cloud"],
                "hectares": ha, "tco2e_proposed": amount, "minted": json.loads(out), "tx": tx})


if __name__ == "__main__":
    if sys.argv[1] == "register":
        cmd_register()
    else:
        cmd_verify(sys.argv[2], int(sys.argv[3]), sys.argv[4])
