import { useMemo } from "react";

export type Cover = Record<string, Record<string, { clases: Record<string, number>; pixeles: number }>>;

const pct = (n: number) => `${Math.round(n * 100)} %`;
const GROUPS = [
  { key: "árboles", label: "Árboles", css: "var(--lc-tree)" },
  { key: "cultivos", label: "Cultivos", css: "var(--lc-crop)" },
  { key: "pastizal", label: "Pastizal", css: "var(--lc-grass)" },
] as const;

/** Cruza la señal de NDVI con una fuente independiente de cobertura del suelo (Impact Observatory, 10 m). */
export default function CoverCheck({ data, frozen }: { data?: Cover[string]; frozen: boolean }) {
  const years = useMemo(() => (data ? Object.keys(data).sort() : []), [data]);
  if (!data || years.length < 2) return null;

  const tree = (y: string) => data[y].clases["árboles"] ?? 0;
  const first = years[0], last = years[years.length - 1];
  const delta = tree(last) - tree(first);

  let verdict: { tone: "ok" | "crit"; text: string };
  if (frozen && Math.abs(delta) < 0.05) {
    verdict = { tone: "crit", text: `Posible falso positivo. El NDVI cayó, pero la cobertura no cambió: árboles ${pct(tree(first))} en ${first} y ${pct(tree(last))} en ${last}. Un auditor tiene que revisarlo antes de descongelar o descartar el predio.` };
  } else if (!frozen && delta < -0.2) {
    verdict = { tone: "crit", text: `Alerta. El NDVI no cayó, pero los árboles bajaron de ${pct(tree(first))} a ${pct(tree(last))}. Puede ser conversión a cultivo medida en plena estación verde.` };
  } else {
    verdict = { tone: "ok", text: `Coherente con el NDVI: árboles ${pct(tree(first))} en ${first} y ${pct(tree(last))} en ${last}.` };
  }

  return (
    <div className="cover">
      <ul className="covbars" aria-label="Cobertura del suelo por año">
        {years.map((y) => {
          const cl = data[y].clases;
          const known = GROUPS.reduce((s, g) => s + (cl[g.key] ?? 0), 0);
          return (
            <li key={y}>
              <span className="mono yr">{y}</span>
              <span className="stack" role="img" aria-label={GROUPS.map((g) => `${g.label} ${pct(cl[g.key] ?? 0)}`).join(", ")}>
                {GROUPS.map((g) => (cl[g.key] ?? 0) > 0 && <i key={g.key} style={{ width: `${(cl[g.key] ?? 0) * 100}%`, background: g.css }} />)}
                {known < 0.995 && <i style={{ width: `${(1 - known) * 100}%`, background: "var(--lc-other)" }} />}
              </span>
              <span className="mono val">árboles {pct(cl["árboles"] ?? 0)}</span>
            </li>
          );
        })}
      </ul>
      <p className="legend">
        {GROUPS.map((g) => <span key={g.key}><i style={{ background: g.css }} /> {g.label}</span>)}
        <span><i style={{ background: "var(--lc-other)" }} /> Otros</span>
      </p>
      <p className={`msg ${verdict.tone}`}>{verdict.text}</p>
      <p className="muted small">Fuente: Impact Observatory, cobertura anual a 10 m (Planetary Computer). Es independiente del NDVI y llega hasta 2023.</p>
    </div>
  );
}
