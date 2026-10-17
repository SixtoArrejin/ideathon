import { useState } from "react";
import CoverCheck from "../components/CoverCheck";
import NdviChart from "../components/NdviChart";
import ParcelMap from "../components/ParcelMap";
import { EXPERT, PARCEL_IDS } from "../config";
import { useData } from "../data";
import { fmt, ndvi, PARCEL_LABELS, period, short } from "../lib";
import ProposeParcel from "../components/ProposeParcel";
import { hrefFor } from "../router";

const STAC_ITEM = (id: string) => `https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/${id}`;
type Tab = "resumen" | "cobertura" | "evidencia";
const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "cobertura", label: "Cobertura del suelo" },
  { id: "evidencia", label: "Evidencia" },
];

export default function Parcels({ selected }: { selected: string }) {
  const { parcels, ver, cover } = useData();
  const [tab, setTab] = useState<Tab>("resumen");
  const [propose, setPropose] = useState(false);
  const p = parcels[selected];
  const meta = PARCEL_LABELS[selected];
  const evidence = ver.filter((v) => v.parcel === selected);
  const delta = p ? p.last_ndvi_milli - p.baseline_ndvi_milli : 0;

  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Predios</p>
        <h1>Predios verificados</h1>
        <p className="lead">Cada predio se mide con el mismo método satelital y queda registrado en la red. Estos son los de la demostración; cualquiera puede proponer uno nuevo.</p>
      </header>

      <ul className="picker">
        {PARCEL_IDS.map((id) => {
          const q = parcels[id];
          return (
            <li key={id}>
              <a href={hrefFor("predios", id)} className={`pick ${id === selected ? "is-on" : ""} ${q?.frozen ? "is-frozen" : ""}`} aria-current={id === selected ? "true" : undefined}>
                <span className="mono">{id}</span>
                <b>{PARCEL_LABELS[id].name}</b>
                <em>{q ? (q.frozen ? "Congelado" : "Activo") : "…"}</em>
              </a>
            </li>
          );
        })}
        <li>
          <button className="pick add" onClick={() => setPropose(true)}>
            <span className="mono">+</span>
            <b>Sumar un predio</b>
            <em>Proponer</em>
          </button>
        </li>
      </ul>
      <ProposeParcel open={propose} onClose={() => setPropose(false)} />

      <section className="explorer" aria-label="Detalle del predio">
        <div className="mapcol">
          <ParcelMap parcels={parcels} selected={selected} onSelect={(id) => { window.location.hash = hrefFor("predios", id); }} />
        </div>
        <div className="detail">
          {p ? (
            <article className="panel">
              <header>
                <div>
                  <h2>{meta.name}</h2>
                  <p className="muted small">{meta.zone} · {fmt(p.hectares)} ha</p>
                </div>
                <span className={`status ${p.frozen ? "crit" : "ok"}`}>{p.frozen ? "Congelado: no emite" : "Activo: emite por período"}</span>
              </header>

              <div className="seg" role="tablist" aria-label="Secciones del predio">
                {TABS.map((t) => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>

              {tab === "resumen" && (
                <div className="tabbody">
                  <NdviChart p={p} />
                  <dl className="kv">
                    <div><dt>Emitido</dt><dd className="mono">{fmt(p.issued_tco2e)} tCO₂e</dd></div>
                    <div><dt>Variación de NDVI</dt><dd className="mono">{(delta >= 0 ? "+" : "−") + ndvi(Math.abs(delta))}</dd></div>
                    <div><dt>Propietario</dt><dd className="mono" title={p.owner}>{short(p.owner)}</dd></div>
                    <div><dt>Polígono</dt><dd className="mono">{p.bbox}</dd></div>
                  </dl>
                </div>
              )}

              {tab === "cobertura" && (
                <div className="tabbody">
                  <p className="muted small">Una fuente distinta del NDVI, para no depender de una sola señal.</p>
                  <CoverCheck data={cover[selected]} frozen={p.frozen} />
                </div>
              )}

              {tab === "evidencia" && (
                <div className="tabbody">
                  <p className="muted small">Cada fila es un lote: una verificación satelital registrada en el contrato.</p>
                  <div className="tablewrap">
                    <table>
                      <thead><tr><th>Lote</th><th>NDVI</th><th>Escena</th><th>Resultado</th><th></th></tr></thead>
                      <tbody>
                        {evidence.map((v, i) => (
                          <tr key={v.tx}>
                            <td className="mono">{period(v.period)}{i === 0 && <span className="tagbase">línea base</span>}</td>
                            <td className="mono">{v.ndvi.toFixed(3).replace(".", ",")}</td>
                            <td><a href={STAC_ITEM(v.scene)} target="_blank" rel="noreferrer" className="mono">{v.scene_date} ↗</a></td>
                            <td>{Number(v.minted) > 0 ? <span className="ok">+{fmt(Number(v.minted))} GTON</span> : <span className="crit">Sin emisión</span>}</td>
                            <td><a href={`${EXPERT}/tx/${v.tx}`} target="_blank" rel="noreferrer">Tx ↗</a></td>
                          </tr>
                        ))}
                        {evidence.length === 0 && <tr><td colSpan={5} className="muted">Sin verificaciones registradas.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          ) : <p className="muted">Leyendo el contrato…</p>}
        </div>
      </section>
    </div>
  );
}
