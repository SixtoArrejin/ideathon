import { useState } from "react";
import CountUp from "../components/CountUp";
import HeroSat from "../components/HeroSat";
import ProposeParcel from "../components/ProposeParcel";
import { NewsList, SceneList } from "../components/Radar";
import Ticker from "../components/Ticker";
import { useData } from "../data";
import { hrefFor } from "../router";

const STEPS = [
  { tag: "Sentinel-2", title: "El satélite mira", text: "Cada pocos días una imagen pública de la ESA cubre el polígono GPS de cada predio." },
  { tag: "Oráculo", title: "Se mide el vigor", text: "Un oráculo calcula el NDVI de la copa y lo contrasta con un mapa de cobertura independiente." },
  { tag: "Soroban", title: "El contrato decide", text: "Si el bosque se sostiene, emite un lote de GreenTon. Si cae, congela el predio y no emite." },
  { tag: "Stellar", title: "Comprar es compensar", text: "La empresa paga y quema las toneladas en una sola transacción. Queda su nombre y el lote de origen." },
];

const WHY = [
  { n: "Una tonelada, un solo dueño", t: "En la base de datos de un operador, la misma tonelada se puede vender dos veces o editar después. En un contrato compartido el saldo es uno solo y lo ve cualquiera." },
  { n: "Pagar y compensar, juntos", t: "El mercado cobra, le paga al dueño y quema las toneladas en una sola transacción. Ni el comprador ni el vendedor tienen que confiar en la otra parte ni en un intermediario." },
  { n: "Reglas y pruebas que nadie reescribe", t: "El umbral que congela un predio y cada verificación quedan grabados con su escena satelital. Ni el propietario ni nosotros podemos cambiarlos después." },
];

export default function Home() {
  const { supply, retired, frozen, parcels, offers } = useData();
  const [propose, setPropose] = useState(false);
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
          <HeroSat />
        </div>
      </section>

      <Ticker />

      <section className="wrap band">
        <dl className="figures">
          <div><dt>En circulación</dt><dd>{supply === null ? "…" : <CountUp value={Number(supply)} />}</dd><small>GTON · 1 GTON = 1 tCO₂e</small></div>
          <div><dt>Retiradas</dt><dd>{retired === null ? "…" : <CountUp value={Number(retired)} />}</dd><small>tCO₂e quemadas para siempre</small></div>
          <div><dt>Predios congelados</dt><dd className={frozen ? "crit" : ""}>{total ? `${frozen} de ${total}` : "…"}</dd><small>por caída de vegetación</small></div>
          <div><dt>Ofertas abiertas</dt><dd>{total ? <CountUp value={offers.length} /> : "…"}</dd><small>en el mercado</small></div>
        </dl>
      </section>

      <section className="wrap section problem">
        <header className="section-head">
          <p className="kicker">El problema</p>
          <h2>Un crédito de carbono vale lo que vale la prueba que tiene detrás</h2>
          <p className="lead">Hoy esa prueba suele ser un PDF firmado. Mientras tanto, el bosque que se dice proteger puede estar cayendo.</p>
        </header>
        <ul className="stats3">
          <li><b>119.886 ha</b><span>de bosque nativo desmontadas en el norte argentino en 2024, según Greenpeace.</span></li>
          <li><b>210.702 ha</b><span>perdidas en 2025 entre desmonte e incendios, según el mismo informe.</span></li>
          <li><b>Sin marco legal</b><span>El mercado de carbono argentino sigue esperando una ley: el Senado dio dictamen en septiembre de 2026.</span></li>
        </ul>
      </section>

      <section className="wrap section why">
        <header className="section-head">
          <p className="kicker">Por qué en una blockchain</p>
          <h2>No es tecnología por la tecnología: es donde la confianza no se puede delegar</h2>
        </header>
        <ul className="why3">
          {WHY.map((w) => (
            <li key={w.n}><h3>{w.n}</h3><p>{w.t}</p></li>
          ))}
        </ul>
        <p className="note"><b>Lo que no va a la cadena:</b> las imágenes, el cálculo del NDVI y los mapas. Solo vive en la red lo que necesita confianza compartida.</p>
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

      <section className="wrap section radar" id="radar">
        <header className="section-head">
          <p className="kicker">Radar del Chaco</p>
          <h2>Lo que está pasando en el monte, y cuándo lo vuelve a mirar el satélite</h2>
        </header>
        <div className="radar-grid">
          <NewsList />
          <SceneList />
        </div>
        <div className="join">
          <div>
            <h3>¿Tenés un bosque, o compensás tu huella?</h3>
            <p className="muted">Proponé un predio para que el oráculo lo mida, o comprá toneladas de un lote que ya tiene evidencia.</p>
          </div>
          <div className="cta">
            <button className="btn" onClick={() => setPropose(true)}>Proponer un predio</button>
            <a className="btn ghost" href={hrefFor("mercado")}>Comprar toneladas</a>
          </div>
        </div>
      </section>
      <ProposeParcel open={propose} onClose={() => setPropose(false)} />
    </>
  );
}
