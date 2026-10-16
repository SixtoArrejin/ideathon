import { useEffect } from "react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { CONFIGURED } from "./config";
import { DataProvider, useData } from "./data";
import Account from "./pages/Account";
import Home from "./pages/Home";
import Market from "./pages/Market";
import Parcels from "./pages/Parcels";
import Transparency from "./pages/Transparency";
import { PARCEL_IDS } from "./config";
import { PAGES, useRoute } from "./router";

function Shell() {
  const { page, param } = useRoute();
  const { err } = useData();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = page === "inicio" ? "Dosel · créditos de carbono con respaldo satelital" : `${PAGES.find((p) => p.id === page)?.label} · Dosel`;
  }, [page, param]);

  const selected = param && PARCEL_IDS.includes(param) ? param : PARCEL_IDS[0];

  return (
    <>
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <Navbar page={page} />
      <main id="contenido" key={page} className="page">
        {err && <div className="wrap"><p className="msg crit" role="alert">No se pudo leer la red de Stellar: {err}</p></div>}
        {page === "inicio" && <Home />}
        {page === "predios" && <Parcels selected={selected} />}
        {page === "mercado" && <Market />}
        {page === "cuenta" && <Account />}
        {page === "transparencia" && <Transparency />}
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  if (!CONFIGURED) {
    return (
      <main className="wrap page-pad">
        <h1>Falta configurar los contratos.</h1>
        <p className="lead">Definí <code>VITE_GREENTON_ID</code> y <code>VITE_MARKET_ID</code> con los IDs de GreenTon v2 y del mercado en Testnet (ver DEPLOY.md) y volvé a compilar.</p>
      </main>
    );
  }
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
