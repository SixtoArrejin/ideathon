import { useMemo } from "react";
import { PARCEL_IDS } from "../config";
import { useData } from "../data";
import { PARCEL_LABELS } from "../lib";
import { ago, dateEs, useLatestScenes, useNews } from "../radar";

export function NewsList() {
  const { news, failed } = useNews();
  const items = news?.items.slice(0, 6) ?? [];
  return (
    <div className="radar-col">
      <header>
        <h3>Noticias del monte</h3>
        <p className="muted small">Titulares recientes sobre desmonte, incendios y mercado de carbono.</p>
      </header>
      {!news && !failed && <p className="muted">Leyendo titulares…</p>}
      {failed && <p className="muted">No se pudieron cargar los titulares.</p>}
      <ul className="news">
        {items.map((n) => (
          <li key={n.url}>
            <a href={n.url} target="_blank" rel="noreferrer">{n.title}</a>
            <span className="muted small">{n.source} · {dateEs(n.date)}</span>
          </li>
        ))}
      </ul>
      {news && <p className="muted small">Actualizado el {dateEs(news.fetched_at)}. Titulares de terceros vía Google Noticias; Dosel no los verifica.</p>}
    </div>
  );
}

export function SceneList() {
  const { parcels } = useData();
  const bboxes = useMemo(() => Object.fromEntries(PARCEL_IDS.map((id) => [id, parcels[id]?.bbox ?? ""])), [parcels]);
  const { scenes, done } = useLatestScenes(bboxes);
  return (
    <div className="radar-col">
      <header>
        <h3>Última pasada del satélite</h3>
        <p className="muted small">Consultado ahora al catálogo público de Sentinel-2. Sirve para saber cuándo toca la próxima verificación.</p>
      </header>
      <ul className="scenes">
        {PARCEL_IDS.map((id) => {
          const s = scenes[id];
          return (
            <li key={id}>
              <div><span className="mono">{id}</span> <b>{PARCEL_LABELS[id].name}</b></div>
              {!done ? <span className="muted small">Consultando…</span>
                : s ? <span className="small"><b className="mono">{dateEs(s.date)}</b> <span className="muted">· {ago(s.date)} · nubes {Math.round(s.cloud)} %</span></span>
                : <span className="muted small">Sin dato por ahora</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
