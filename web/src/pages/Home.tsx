import CountUp from "../components/CountUp";
import HeroSat from "../components/HeroSat";
import { useData } from "../data";
import { hrefFor } from "../router";

const STEPS = [
  { tag: "Sentinel-2", title: "El satélite mira", text: "Una imagen pública cubre el polígono de cada predio." },
  { tag: "Oráculo", title: "Se mide el vigor", text: "Se calcula el NDVI de la copa y se contrasta con otra fuente." },
  { tag: "Soroban", title: "El contrato decide", text: "Emite un lote de GreenTon, o congela el predio si el bosque cae." },
  { tag: "Stellar", title: "Comprar es compensar", text: "Se paga y se quema en una sola transacción, con el lote de origen." },
];

export default function Home() {
  const { supply, retired, frozen, parcels } = useData();
  const total = Object.keys(parcels).length;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="kicker">Sentinel-2 · Soroban · Stellar</p>
            <h1>El bosque, verificado <em>desde arriba.</em></h1>
            <p className="lead">Dosel mide la copa del bosque con imágenes de satélite y emite créditos de carbono solo mientras el bosque sigue en pie. Cada tonelada se puede rastrear hasta la escena que la originó.</p>
            <div className="cta">
              <a className="btn" href={hrefFor("predios")}>Explorar los predios</a>
              <a className="btn ghost" href={hrefFor("mercado")}>Ir al mercado</a>
            </div>
          </div>
          <HeroSat />
        </div>
      </section>

      <section className="wrap band">
        <dl className="figures">
          <div><dt>En circulación</dt><dd>{supply === null ? "…" : <CountUp value={Number(supply)} />}</dd><small>GTON · 1 GTON = 1 tCO₂e</small></div>
          <div><dt>Retiradas</dt><dd>{retired === null ? "…" : <CountUp value={Number(retired)} />}</dd><small>tCO₂e quemadas</small></div>
          <div><dt>Predios congelados</dt><dd className={frozen ? "crit" : ""}>{total ? `${frozen} de ${total}` : "…"}</dd><small>por caída de vegetación</small></div>
        </dl>
      </section>

      <section className="wrap section">
        <header className="section-head">
          <p className="kicker">Cómo funciona</p>
          <h2>De la imagen satelital a la tonelada compensada</h2>
        </header>
        <ol className="steps4">
          {STEPS.map((s, i) => (
            <li key={s.tag}>
              <span className="mono tag">{String(i + 1).padStart(2, "0")} · {s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="why-link">¿Por qué esto necesita una blockchain? <a href={`${hrefFor("transparencia")}`}>Leé el porqué →</a></p>
      </section>
    </>
  );
}
