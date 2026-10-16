import { NDVI_MAX_DROP, NDVI_MIN, ndvi as fmtNdvi } from "../lib";
import type { Parcel } from "../chain";

/** Recorrido de NDVI 0..1: línea base (aro) -> último valor (punto), con el mínimo absoluto y el límite de caída marcados. */
export default function NdviChart({ p }: { p: Parcel }) {
  const W = 420, H = 132, L = 14, R = 20, y = 46;
  const x = (v: number) => L + v * (W - L - R);
  const base = p.baseline_ndvi_milli / 1000;
  const last = p.last_ndvi_milli / 1000;
  const limit = base - NDVI_MAX_DROP;
  const tone = p.frozen ? "crit" : "ok";
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const close = Math.abs(x(limit) - x(NDVI_MIN)) < 100;

  return (
    <figure className="chartfig">
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
      aria-label={`NDVI de línea base ${fmtNdvi(p.baseline_ndvi_milli)} y último valor ${fmtNdvi(p.last_ndvi_milli)}. Mínimo permitido 0,400; caída máxima 0,150.`}>
      <rect x={x(0)} y={y - 18} width={x(NDVI_MIN) - x(0)} height={36} fill="var(--crit)" opacity="0.1" />
      <line x1={x(0)} x2={x(1)} y1={y} y2={y} stroke="var(--line)" strokeWidth="2" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y + 18} y2={y + 23} stroke="var(--muted)" />
          <text x={x(t)} y={y + 36} textAnchor="middle" className="axis">{t.toFixed(1).replace(".", ",")}</text>
        </g>
      ))}
      <line x1={x(NDVI_MIN)} x2={x(NDVI_MIN)} y1={y - 18} y2={y + 18} stroke="var(--crit)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={x(NDVI_MIN)} y={y + 58} textAnchor="middle" className="axis crit">mínimo 0,40</text>
      <line x1={x(limit)} x2={x(limit)} y1={y - 12} y2={y + 12} stroke="var(--muted)" strokeWidth="1.5" />
      <text x={x(limit)} y={y + (close ? 74 : 58)} textAnchor="middle" className="axis">caída máx. 0,15</text>
      <line x1={x(base)} x2={x(last)} y1={y} y2={y} stroke={`var(--${tone})`} strokeWidth="4" strokeLinecap="round" />
      <circle cx={x(base)} cy={y} r="8" fill="var(--surface)" stroke={`var(--${tone})`} strokeWidth="3" />
      <circle cx={x(last)} cy={y} r="8" fill={`var(--${tone})`} stroke="var(--surface)" strokeWidth="2" />
      {Math.abs(base - last) < 0.12 ? (
        <text x={(x(base) + x(last)) / 2} y={y - 16} textAnchor="middle" className={`val ${tone}`}>
          {fmtNdvi(p.baseline_ndvi_milli)} → {fmtNdvi(p.last_ndvi_milli)}
        </text>
      ) : (
        <>
          <text x={x(base)} y={y - 16} textAnchor="middle" className="val">{fmtNdvi(p.baseline_ndvi_milli)}</text>
          <text x={x(last)} y={y - 16} textAnchor="middle" className={`val ${tone}`}>{fmtNdvi(p.last_ndvi_milli)}</text>
        </>
      )}
    </svg>
    <figcaption className="legend">
      <span><i className="ring" style={{ borderColor: `var(--${tone})` }} /> línea base</span>
      <span><i className="dot" style={{ background: `var(--${tone})` }} /> último valor</span>
      <span><i className="bar" /> límite de caída</span>
    </figcaption>
    </figure>
  );
}
