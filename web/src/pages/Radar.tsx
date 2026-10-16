import { useState } from "react";
import ProposeParcel from "../components/ProposeParcel";
import { NewsList, SceneList } from "../components/Radar";
import { hrefFor } from "../router";

export default function Radar() {
  const [propose, setPropose] = useState(false);
  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Radar del Chaco</p>
        <h1>Lo que pasa en el monte, y cuándo lo vuelve a mirar el satélite</h1>
        <p className="lead">Titulares recientes sobre desmonte y mercado de carbono, y la última imagen disponible de cada predio.</p>
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
      <ProposeParcel open={propose} onClose={() => setPropose(false)} />
    </div>
  );
}
