import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseBbox, PARCEL_LABELS } from "../lib";
import type { Parcel } from "../chain";

type Props = { parcels: Record<string, Parcel>; selected: string; onSelect: (id: string) => void };

const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export default function ParcelMap({ parcels, selected, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<Record<string, L.Rectangle>>({});

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true });
    L.tileLayer(TILES, { maxZoom: 17, attribution: "Imagen © Esri, Maxar, Earthstar Geographics" }).addTo(m);
    m.setView([-26, -60.5], 7);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; layers.current = {}; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    Object.values(layers.current).forEach((r) => r.remove());
    layers.current = {};
    for (const [id, p] of Object.entries(parcels)) {
      const color = p.frozen ? "#ff6a4d" : "#6fe3a1";
      const rect = L.rectangle(parseBbox(p.bbox), { color, weight: id === selected ? 3 : 1.5, fillOpacity: id === selected ? 0.18 : 0.08 })
        .addTo(m)
        .bindTooltip(`${id} · ${PARCEL_LABELS[id]?.name ?? ""}`, { sticky: true });
      rect.on("click", () => onSelect(id));
      layers.current[id] = rect;
    }
    const sel = layers.current[selected];
    if (sel) m.flyToBounds(sel.getBounds().pad(2.2), { duration: 0.8, maxZoom: 13 });
  }, [parcels, selected, onSelect]);

  return <div ref={el} className="map" role="img" aria-label="Mapa satelital de los predios verificados" />;
}
