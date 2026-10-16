"""Calcula el NDVI medio de un bbox con Sentinel-2 L2A (Microsoft Planetary Computer, STAC público).

Uso: python ndvi.py <lon_min,lat_min,lon_max,lat_max> <YYYY-MM-DD/YYYY-MM-DD>
Imprime JSON con ndvi (0..1), escena usada y fecha.
"""
import json
import sys

import numpy as np
import planetary_computer as pc
import rasterio
from pystac_client import Client
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"


def _read_band(asset, bbox, offset):
    """Lee la banda como reflectancia: (DN * 0.0001) + offset.

    Desde el baseline de procesamiento 04.00 (ene-2022) ESA suma un offset de -0.1; los assets
    de Planetary Computer no lo declaran, así que se aplica según `s2:processing_baseline`.
    """
    scale = 0.0001
    with rasterio.open(asset.href) as src:
        b = transform_bounds("EPSG:4326", src.crs, *bbox)
        win = from_bounds(*b, transform=src.transform)
        dn = src.read(1, window=win, boundless=False, out_dtype="float32")
    refl = np.clip(dn * scale + offset, 0.0, None)
    refl[dn == 0] = np.nan  # nodata
    return refl


def mean_ndvi(bbox, date_range, max_cloud=20):
    cat = Client.open(STAC, modifier=pc.sign_inplace)
    items = list(
        cat.search(
            collections=["sentinel-2-l2a"],
            bbox=bbox,
            datetime=date_range,
            query={"eo:cloud_cover": {"lt": max_cloud}},
        ).items()
    )
    if not items:
        raise RuntimeError("sin escenas Sentinel-2 con poca nubosidad en el rango")
    items.sort(key=lambda i: i.properties["eo:cloud_cover"])
    it = items[0]
    baseline = float(it.properties.get("s2:processing_baseline", "0"))
    offset = -0.1 if baseline >= 4.0 else 0.0
    red = _read_band(it.assets["B04"], bbox, offset)
    nir = _read_band(it.assets["B08"], bbox, offset)
    n = min(red.shape[0], nir.shape[0]), min(red.shape[1], nir.shape[1])
    red, nir = red[: n[0], : n[1]], nir[: n[0], : n[1]]
    valid = np.isfinite(red) & np.isfinite(nir) & ((red + nir) > 0)
    ndvi = (nir[valid] - red[valid]) / (nir[valid] + red[valid])
    return {
        "ndvi": float(np.nanmean(ndvi)),
        "scene": it.id,
        "date": it.datetime.date().isoformat(),
        "cloud": it.properties["eo:cloud_cover"],
        "pixels": int(valid.sum()),
    }


if __name__ == "__main__":
    bbox = [float(x) for x in sys.argv[1].split(",")]
    print(json.dumps(mean_ndvi(bbox, sys.argv[2])))
