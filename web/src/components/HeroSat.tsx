import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PARCEL_IDS } from "../config";
import { useData } from "../data";
import { ndvi, parseBbox, PARCEL_LABELS } from "../lib";
import { hrefFor } from "../router";

const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Una ventana satelital en vivo que recorre los predios y muestra qué dijo el contrato de cada uno. */
export default function HeroSat() {
  const { parcels } = useData();
  const [i, setI] = useState(0);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const rect = useRef<L.Rectangle | null>(null);
  const id = PARCEL_IDS[i];
  const p = parcels[id];

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false, attributionControl: false,
    });
    L.tileLayer(TILES, { maxZoom: 17 }).addTo(m);
    L.control.attribution({ prefix: false, position: "bottomright" }).addAttribution("Imagen © Esri, Maxar").addTo(m);
    m.setView([-26, -60.5], 7);
    map.current = m;
    return () => { m.remove(); map.current = null; rect.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !p) return;
    rect.current?.remove();
    const color = p.frozen ? "#ff6a4d" : "#6fe3a1";
    rect.current = L.rectangle(parseBbox(p.bbox), { color, weight: 3, fillOpacity: 0.14 }).addTo(m);
    m.flyToBounds(rect.current.getBounds().pad(2.4), { duration: reduced() ? 0 : 1.6, maxZoom: 13 });
  }, [p, id]);

  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => { if (!document.hidden) setI((n) => (n + 1) % PARCEL_IDS.length); }, 7500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="satwin">
      <div ref={el} className="satmap" role="img" aria-label="Imagen satelital en vivo de los predios verificados" />
      <i className="br tl" /><i className="br tr" /><i className="br bl" /><i className="br brr" />
      <div className="satchip top">
        <span className="mono">{id}</span>
        <b>{PARCEL_LABELS[id].name}</b>
      </div>
      <a className={`satchip bottom ${p?.frozen ? "is-frozen" : ""}`} href={hrefFor("predios", id)}>
        <span className="mono">NDVI {p ? ndvi(p.last_ndvi_milli) : "…"}</span>
        <b>{p ? (p.frozen ? "Congelado" : "Activo") : "…"}</b>
        <span className="go">Ver evidencia →</span>
      </a>
      <div className="satdots" role="tablist" aria-label="Elegir predio">
        {PARCEL_IDS.map((pid, n) => (
          <button key={pid} role="tab" aria-selected={n === i} aria-label={pid} className={n === i ? "is-on" : ""} onClick={() => setI(n)} />
        ))}
      </div>
    </div>
  );
}
