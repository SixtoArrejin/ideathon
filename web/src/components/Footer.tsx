import { CONTRACT_ID, EXPERT, MARKET_ID } from "../config";
import { hrefFor } from "../router";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-main">
        <div className="foot-brand">
          <a className="brand" href={hrefFor("inicio")} aria-label="Dosel, inicio"><Logo size={36} /><span>Dosel</span></a>
          <p className="foot-tag">El bosque, verificado desde arriba.</p>
          <p className="muted small">Créditos de carbono de bosque nativo del Gran Chaco, medidos con satélite y emitidos y retirados en Stellar.</p>
        </div>
        <div className="foot-col">
          <h3>Explorar</h3>
          <a href={hrefFor("predios")}>Predios</a>
          <a href={hrefFor("mercado")}>Mercado</a>
          <a href={hrefFor("radar")}>Radar</a>
          <a href={hrefFor("cuenta")}>Mi cuenta</a>
        </div>
        <div className="foot-col">
          <h3>Verificar</h3>
          <a href={hrefFor("transparencia")}>Transparencia</a>
          <a href={`${EXPERT}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">GreenTon en Stellar Expert ↗</a>
          <a href={`${EXPERT}/contract/${MARKET_ID}`} target="_blank" rel="noreferrer">Mercado en Stellar Expert ↗</a>
        </div>
        <div className="foot-col">
          <h3>Proyecto</h3>
          <span className="muted">IDEATHON Neatech 2026</span>
          <span className="muted">Stellar Track</span>
          <span className="muted">Prototipo en Testnet</span>
        </div>
      </div>
      <div className="foot-base">
        <div className="wrap">
          <p className="muted small">El factor NDVI → tCO₂e es ilustrativo, no una metodología certificada. El oráculo es una sola clave en esta versión.</p>
          <div className="row">
            <span className="pill">Testnet</span>
            <button className="totop" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Volver arriba ↑</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
