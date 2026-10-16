import { hrefFor, PAGES } from "../router";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-grid">
        <div>
          <a className="brand" href={hrefFor("inicio")}><Logo size={24} /><span>Dosel</span></a>
          <p className="muted small">Créditos de carbono de bosque nativo con respaldo satelital, sobre Stellar. Prototipo del IDEATHON Neatech 2026. Solo Testnet.</p>
        </div>
        <nav aria-label="Pie">
          {PAGES.map((p) => <a key={p.id} href={hrefFor(p.id)}>{p.label}</a>)}
        </nav>
        <p className="muted small">El factor que convierte NDVI en tCO₂e es ilustrativo y no corresponde a una metodología certificada. El oráculo es una sola clave en esta versión.</p>
      </div>
    </footer>
  );
}
