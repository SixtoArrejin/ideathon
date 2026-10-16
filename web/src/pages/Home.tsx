import CanopyArt from "../components/CanopyArt";
import CountUp from "../components/CountUp";
import { useData } from "../data";
import { ndvi } from "../lib";
import { hrefFor } from "../router";

const STEPS = [
  { tag: "Sentinel-2", title: "El satélite mira", text: "Cada pocos días una imagen pública de la ESA cubre el polígono GPS de cada predio." },
  { tag: "Oráculo", title: "Se mide el vigor", text: "Un oráculo calcula el NDVI de la copa y lo contrasta con un mapa de cobertura independiente." },
  { tag: "Soroban", title: "El contrato decide", text: "Si el bosque se sostiene, emite un lote de GreenTon. Si cae, congela el predio y no emite." },
  { tag: "Stellar", title: "Comprar es compensar", text: "La empresa paga y quema las toneladas en una sola transacción. Queda su nombre y el lote de origen." },
];

export default function Home() {
  const { supply, retired, frozen, parcels, offers } = useData();
  const lead = parcels.IMPEN1;
  const total = Object.keys(parcels).length;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="kicker">Gran Chaco · Sentinel-2 · Stellar</p>
            <h1>El bosque, verificado <em>desde arriba</em>.</h1>
            <p className="lead">Dosel mide la copa del bosque con imágenes de satélite y emite créditos de carbono solo mientras el bosque sigue en pie. Cada tonelada se puede rastrear hasta la escena que la originó.</p>
            <div className="cta">
              <a className="btn" href={hrefFor("predios")}>Explorar los predios</a>
              <a className="btn ghost" href={hrefFor("mercado")}>Ir al mercado</a>
            </div>
          </div>
          <CanopyArt caption={lead ? `IMPEN1 · NDVI ${ndvi(lead.last_ndvi_milli)} · estable` : "IMPEN1 · leyendo la red…"} />
        </div>
      </section>

      <section className="wrap band">
        <dl className="figures">
          <div><dt>En circulación</dt><dd>{supply === null ? "…" : <CountUp value={Number(supply)} />}</dd><small>GTON · 1 GTON = 1 tCO₂e</small></div>
          <div><dt>Retiradas</dt><dd>{retired === null ? "…" : <CountUp value={Number(retired)} />}</dd><small>tCO₂e quemadas para siempre</small></div>
          <div><dt>Predios congelados</dt><dd className={frozen ? "crit" : ""}>{total ? `${frozen} de ${total}` : "…"}</dd><small>por caída de vegetación</small></div>
          <div><dt>Ofertas abiertas</dt><dd>{total ? <CountUp value={offers.length} /> : "…"}</dd><small>en el mercado</small></div>
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
      </section>

      <section className="wrap section">
        <div className="doors">
          <a className="door" href={hrefFor("predios")}>
            <p className="kicker">Predios</p>
            <h3>Tres predios con evidencia real</h3>
            <p>Mapa satelital, NDVI contra los umbrales del contrato y un cruce con cobertura del suelo. Uno de ellos está congelado, y no es lo que parece.</p>
            <span className="go">Ver los predios →</span>
          </a>
          <a className="door" href={hrefFor("mercado")}>
            <p className="kicker">Mercado</p>
            <h3>Comprar y quemar en un paso</h3>
            <p>Elegí un lote, indicá a nombre de quién compensás y firmá con Freighter. Si el pago falla, no se quema nada.</p>
            <span className="go">Abrir el mercado →</span>
          </a>
        </div>
      </section>

      <section className="wrap section candid">
        <p className="kicker">Lo que decimos de frente</p>
        <p className="lead">Es un prototipo en Testnet. El oráculo es una sola clave, el factor de toneladas es ilustrativo y el NDVI solo puede confundir un cultivo con una tala. Por eso hay una segunda señal y una persona que decide.</p>
        <a className="go" href={hrefFor("transparencia")}>Ver todos los límites →</a>
      </section>
    </>
  );
}
