"""Validación cruzada: compara la señal de NDVI con una fuente independiente de cobertura del suelo.

Usa Impact Observatory 10 m Annual Land Use Land Cover (io-lulc-annual-v02, Planetary Computer,
2017-2023). Para cada predio calcula qué fracción del polígono es "árboles" (clase 2) cada año.
Si un predio realmente perdió bosque, esa fracción tiene que caer; si el NDVI cae pero la
cobertura no cambia, la señal es dudosa (nubes, estación, sequía).

Uso: python crosscheck.py [AAAA AAAA ...]     (por defecto 2017 2019 2023)
"""
import json
import os
import sys

import numpy as np
import planetary_computer as pc
import rasterio
from pystac_client import Client
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
CLASSES = {1: "agua", 2: "árboles", 4: "veg. inundada", 5: "cultivos", 7: "urbano",
           8: "suelo desnudo", 11: "pastizal"}
HERE = os.path.dirname(os.path.abspath(__file__))


def class_fractions(cat, bbox, year):
    items = [i for i in cat.search(collections=["io-lulc-annual-v02"], bbox=bbox).items()
             if i.id.endswith(f"-{year}")]
    if not items:
        raise RuntimeError(f"sin datos de cobertura para {year}")
    with rasterio.open(items[0].assets["data"].href) as src:
        b = transform_bounds("EPSG:4326", src.crs, *bbox)
        arr = src.read(1, window=from_bounds(*b, transform=src.transform))
    valid = arr[(arr != 0) & (arr != 10)]  # sin datos y nubes
    total = valid.size
    return {CLASSES.get(int(c), str(int(c))): round(float((valid == c).sum()) / total, 3)
            for c in np.unique(valid)}, int(total)


if __name__ == "__main__":
    years = [int(y) for y in sys.argv[1:]] or [2017, 2019, 2023]
    cat = Client.open(STAC, modifier=pc.sign_inplace)
    out = {}
    for p in json.load(open(os.path.join(HERE, "parcels.json"))):
        out[p["id"]] = {}
        for y in years:
            fr, n = class_fractions(cat, p["bbox"], y)
            out[p["id"]][y] = {"clases": fr, "pixeles": n}
            print(f"{p['id']} {y}: árboles={fr.get('árboles', 0):.1%} "
                  f"cultivos={fr.get('cultivos', 0):.1%} pastizal={fr.get('pastizal', 0):.1%} (n={n})")
    for dest in (os.path.join(HERE, "crosscheck.json"), os.path.join(HERE, "..", "web", "public", "crosscheck.json")):
        json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
