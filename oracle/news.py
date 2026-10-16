"""Radar de noticias: recopila titulares recientes sobre bosque nativo y desmonte en el Gran Chaco.

Usa el RSS público de Google Noticias (sin clave). Escribe web/public/news.json, que la web lee.
Correr de nuevo para actualizar:  python news.py
"""
import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "web", "public", "news.json")
QUERIES = [
    "desmonte Chaco bosque nativo",
    "deforestación Gran Chaco Argentina",
    "ley de bosques nativos Argentina desmontes",
    "mercado de carbono Argentina bonos de carbono bosques",
    "Impenetrable incendios desmonte Formosa Santiago del Estero",
]
SKIP = re.compile(r"horóscopo|lotería|quiniela|carne|oso hormiguero", re.I)
RELEVANT = re.compile(r"desmont|deforest|bosque|carbono|incendi|monte|forest|selva|chaco|impenetrable", re.I)


def fetch(q):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": f"{q} when:90d", "hl": "es-419", "gl": "AR", "ceid": "AR:es-419"})
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Dosel radar)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    for it in root.iter("item"):
        title = (it.findtext("title") or "").strip()
        source = (it.findtext("source") or "").strip()
        if source and title.endswith(f" - {source}"):
            title = title[: -len(source) - 3].strip()
        when = parsedate_to_datetime(it.findtext("pubDate"))
        yield {"title": title, "source": source or "Google Noticias",
               "url": (it.findtext("link") or "").strip(), "date": when.astimezone(timezone.utc).isoformat()}


def main():
    seen, items = set(), []
    for q in QUERIES:
        try:
            for it in fetch(q):
                key = re.sub(r"\W+", "", it["title"].lower())[:60]
                if key in seen or SKIP.search(it["title"]) or not RELEVANT.search(it["title"]):
                    continue
                seen.add(key)
                items.append(it)
        except Exception as e:  # una consulta caída no frena el resto
            print(f"aviso: '{q}' falló: {e}")
    items.sort(key=lambda i: i["date"], reverse=True)
    items = items[:10]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"fetched_at": datetime.now(timezone.utc).isoformat(), "items": items},
              open(OUT, "w"), ensure_ascii=False, indent=2)
    for i in items:
        print(i["date"][:10], "|", i["source"], "|", i["title"][:90])


if __name__ == "__main__":
    main()
