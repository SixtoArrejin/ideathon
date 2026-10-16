"""Tests de la lógica pura del oráculo (sin red). Correr: .venv/bin/python -m unittest discover -s tests"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.modules.setdefault("ndvi", type(sys)("ndvi"))
sys.modules["ndvi"].mean_ndvi = lambda *a, **k: {}  # evita importar rasterio/red

import run  # noqa: E402


class HectaresTest(unittest.TestCase):
    def test_bbox_chaco_es_aproximadamente_mil_hectareas(self):
        ha = run.hectares([-61.80, -26.00, -61.77, -25.97])
        self.assertTrue(950 <= ha <= 1050, ha)

    def test_crece_con_el_area(self):
        self.assertGreater(run.hectares([-60.95, -25.35, -60.90, -25.30]),
                           run.hectares([-61.80, -26.00, -61.77, -25.97]))


class Tco2eTest(unittest.TestCase):
    def test_bajo_el_piso_no_emite(self):
        self.assertEqual(run.tco2e(1000, 0.35), 0)

    def test_techo_se_satura(self):
        self.assertEqual(run.tco2e(1000, 0.95), run.tco2e(1000, 0.80))
        self.assertEqual(run.tco2e(1000, 0.80), 5500)

    def test_es_monotono(self):
        vals = [run.tco2e(1000, n / 100) for n in range(40, 81, 5)]
        self.assertEqual(vals, sorted(vals))


if __name__ == "__main__":
    unittest.main()
