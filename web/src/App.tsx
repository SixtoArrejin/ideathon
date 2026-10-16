import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getLot, getOffer, getParcel, getRetirement, lotsOf, offerCount, retirementCount, totalRetired, totalSupply,
  type LotBalance, type LotInfo, type Parcel, type Retirement,
} from "./chain";
import { CONFIGURED, CONTRACT_ID, EXPERT, MARKET_ID, PARCEL_IDS } from "./config";
import { fmt, lotLabel, ndvi, PARCEL_LABELS, period, short } from "./lib";
import { connectFreighter, errText } from "./wallet";
import ParcelMap from "./components/ParcelMap";
import NdviChart from "./components/NdviChart";
import RetirePanel from "./components/RetirePanel";
import MarketPanel, { type OpenOffer } from "./components/MarketPanel";
import OwnerPanel from "./components/OwnerPanel";
import Logo from "./components/Logo";

type Verification = {
  parcel: string; period: number; ndvi: number; scene: string; scene_date: string;
  minted: string | number; tx: string;
};

const STAC_ITEM = (id: string) => `https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/${id}`;

function CopyId() {
  const [done, setDone] = useState(false);
  return (
    <button className="copy" aria-label="Copiar ID del contrato" onClick={() => {
      navigator.clipboard?.writeText(CONTRACT_ID).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {});
    }}>{done ? "Copiado" : "Copiar"}</button>
  );
}

export default function App() {
  if (!CONFIGURED) {
    return (
      <main className="wrap">
        <section className="intro">
          <h1>Falta configurar los contratos.</h1>
          <p>Definí <code>VITE_GREENTON_ID</code> y <code>VITE_MARKET_ID</code> con los IDs de GreenTon v2 y del mercado en Testnet (ver DEPLOY.md) y volvé a compilar.</p>
        </section>
      </main>
    );
  }
  return <Dashboard />;
}

function Dashboard() {
  const [supply, setSupply] = useState<bigint | null>(null);
  const [retired, setRetired] = useState<bigint | null>(null);
  const [parcels, setParcels] = useState<Record<string, Parcel>>({});
  const [ver, setVer] = useState<Verification[]>([]);
  const [rets, setRets] = useState<Retirement[]>([]);
  const [offers, setOffers] = useState<OpenOffer[]>([]);
  const [lotInfo, setLotInfo] = useState<Record<string, LotInfo | null>>({});
  const [wallet, setWallet] = useState("");
  const [lots, setLots] = useState<LotBalance[]>([]);
  const [walletErr, setWalletErr] = useState("");
  const [selected, setSelected] = useState(() => {
    const h = window.location.hash.slice(1);
    return PARCEL_IDS.includes(h) ? h : PARCEL_IDS[0];
  });
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, r, n, oc] = await Promise.all([totalSupply(), totalRetired(), retirementCount(), offerCount()]);
      setSupply(s); setRetired(r);
      const ps = await Promise.all(PARCEL_IDS.map(async (id) => [id, await getParcel(id)] as const));
      setParcels(Object.fromEntries(ps));
      const list = await Promise.all(Array.from({ length: Number(n) }, (_, i) => getRetirement(i)));
      setRets(list.filter((x): x is Retirement => !!x).reverse());
      const os = await Promise.all(Array.from({ length: Number(oc) }, async (_, id) => {
        const o = await getOffer(id);
        return o ? { ...o, id } : null;
      }));
      const open = os.filter((o): o is OpenOffer => !!o && o.open);
      setOffers(open);
      const keys = [...new Set(open.map((o) => `${o.parcel}:${o.period}`))];
      const infos = await Promise.all(keys.map(async (k) => {
        const [parcel, p] = k.split(":");
        return [k, await getLot(parcel, Number(p))] as const;
      }));
      setLotInfo(Object.fromEntries(infos));
      setErr("");
    } catch (e) { setErr(errText(e)); }
  }, []);

  const loadWallet = useCallback(async () => {
    if (!wallet) return;
    try { setLots(await lotsOf(wallet)); } catch { setLots([]); }
  }, [wallet]);

  const refresh = useCallback(() => { load(); loadWallet(); }, [load, loadWallet]);

  useEffect(() => {
    load();
    fetch("/verifications.json").then((r) => r.json()).then(setVer).catch(() => {});
  }, [load]);
  useEffect(() => { loadWallet(); }, [loadWallet]);

  async function connect() {
    setWalletErr("");
    try { setWallet(await connectFreighter()); } catch (e) { setWalletErr(errText(e)); }
  }

  const onSelect = useCallback((id: string) => {
    setSelected(id);
    history.replaceState(null, "", `#${id}`);
  }, []);
  const frozen = useMemo(() => Object.values(parcels).filter((p) => p.frozen).length, [parcels]);
  const myOffers = useMemo(() => offers.filter((o) => o.seller === wallet), [offers, wallet]);
  const p = parcels[selected];
  const evidence = ver.filter((v) => v.parcel === selected);
  const meta = PARCEL_LABELS[selected];

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <div className="brand">
            <Logo size={30} />
            Dosel
          </div>
          <div className="contract">
            <span className="pill">Testnet</span>
            <span className="muted">Contrato</span>
            <a className="mono" href={`${EXPERT}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer" title={CONTRACT_ID}>{short(CONTRACT_ID, 5)}</a>
            <CopyId />
            <span className="muted">Mercado</span>
            <a className="mono" href={`${EXPERT}/contract/${MARKET_ID}`} target="_blank" rel="noreferrer" title={MARKET_ID}>{short(MARKET_ID, 5)}</a>
            {wallet
              ? <span className="mono" title={wallet}>{short(wallet, 4)}</span>
              : <button className="copy" onClick={connect}>Conectar Freighter</button>}
          </div>
        </div>
      </header>

      <main className="wrap">
        <section className="intro">
          <h1>El bosque, verificado desde arriba.</h1>
          <p>Dosel es la copa del bosque vista desde arriba, justo lo que mide el satélite. Un oráculo mide la vegetación de cada predio con imágenes Sentinel-2. Con esa medición el contrato emite un lote de GreenTon por predio y período, o congela el predio si el bosque cayó. Quien compensa compra y quema toneladas de un lote concreto, y queda registrado en Stellar de qué predio salieron.</p>
          <dl className="figures">
            <div><dt>En circulación</dt><dd>{supply === null ? "…" : fmt(supply)}<small>GTON · 1 = 1 tCO₂e</small></dd></div>
            <div><dt>Retiradas</dt><dd>{retired === null ? "…" : fmt(retired)}<small>tCO₂e quemadas</small></dd></div>
            <div><dt>Predios congelados</dt><dd className={frozen ? "crit" : ""}>{Object.keys(parcels).length ? `${frozen} de ${Object.keys(parcels).length}` : "…"}<small>por caída de NDVI</small></dd></div>
          </dl>
        </section>

        {err && <p className="msg crit" role="alert">No se pudo leer la red de Stellar: {err}</p>}
        {walletErr && <p className="msg crit" role="alert">{walletErr}</p>}

        <section className="explorer" aria-label="Predios verificados">
          <div className="mapcol">
            <ParcelMap parcels={parcels} selected={selected} onSelect={onSelect} />
          </div>
          <div className="detail">
            <ul className="tabs" role="tablist" aria-label="Predio">
              {PARCEL_IDS.map((id) => (
                <li key={id} role="presentation">
                  <button role="tab" aria-selected={id === selected} className={`tab ${parcels[id]?.frozen ? "is-frozen" : ""}`} onClick={() => onSelect(id)}>
                    <span className="mono">{id}</span>
                    <span>{PARCEL_LABELS[id].name}</span>
                    {parcels[id] && <em>{parcels[id].frozen ? "Congelado" : "Activo"}</em>}
                  </button>
                </li>
              ))}
            </ul>

            {p ? (
              <article>
                <header>
                  <h2>{meta.name}</h2>
                  <span className={`status ${p.frozen ? "crit" : "ok"}`}>{p.frozen ? "Congelado: no emite" : "Activo: emite por período"}</span>
                </header>
                <p className="muted">{meta.zone} · {fmt(p.hectares)} ha · <span className="mono">{p.bbox}</span></p>
                <NdviChart p={p} />
                <dl className="kv">
                  <div><dt>Emitido</dt><dd className="mono">{fmt(p.issued_tco2e)} tCO₂e</dd></div>
                  <div><dt>Propietario</dt><dd className="mono">{short(p.owner)}</dd></div>
                  <div><dt>Variación NDVI</dt><dd className="mono">{(p.last_ndvi_milli - p.baseline_ndvi_milli >= 0 ? "+" : "−") + ndvi(Math.abs(p.last_ndvi_milli - p.baseline_ndvi_milli))}</dd></div>
                </dl>

                <h3>Evidencia satelital por lote</h3>
                <div className="tablewrap"><table>
                  <thead><tr><th>Lote (feb–mar)</th><th>NDVI</th><th>Escena Sentinel-2</th><th>Resultado</th><th></th></tr></thead>
                  <tbody>
                    {evidence.map((v, i) => (
                      <tr key={v.tx}>
                        <td className="mono">{period(v.period)}{i === 0 && <span className="tagbase">línea base</span>}</td>
                        <td className="mono">{v.ndvi.toFixed(3).replace(".", ",")}</td>
                        <td><a href={STAC_ITEM(v.scene)} target="_blank" rel="noreferrer" className="mono">{v.scene_date}</a></td>
                        <td>{Number(v.minted) > 0 ? <span className="ok">+{fmt(Number(v.minted))} GTON</span> : <span className="crit">Sin emisión</span>}</td>
                        <td><a href={`${EXPERT}/tx/${v.tx}`} target="_blank" rel="noreferrer">Ver tx ↗</a></td>
                      </tr>
                    ))}
                    {evidence.length === 0 && <tr><td colSpan={5} className="muted">Sin verificaciones registradas.</td></tr>}
                  </tbody>
                </table></div>
              </article>
            ) : <p className="muted">Leyendo el contrato…</p>}
          </div>
        </section>

        <section className="rules">
          <h2>Qué decide el contrato</h2>
          <ol>
            <li><b>Solo emite el oráculo.</b> El propietario registra el predio con su polígono, pero no puede acuñar.</li>
            <li><b>Un período, un lote.</b> Cada verificación crea un lote propio del predio y del período, y no se puede repetir.</li>
            <li><b>El bosque tiene que seguir en pie.</b> Si el NDVI baja de 0,40 o cae más de 0,15 desde la línea base, el predio se congela y no emite.</li>
            <li><b>Comprar es compensar.</b> El mercado cobra al comprador, paga al vendedor y quema las toneladas del lote en la misma transacción.</li>
            <li><b>Retirar es irreversible.</b> Quemar descuenta del suministro y guarda quién compensó y de qué lote.</li>
          </ol>
        </section>

        <section className="mercado" aria-label="Mercado">
          <h2>Mercado: comprar y quemar</h2>
          <MarketPanel wallet={wallet} offers={offers} parcels={parcels} lotInfo={lotInfo} onDone={refresh} />
        </section>

        <section className="retiro">
          <div>
            <h2>Mi cuenta</h2>
            {wallet ? (
              <>
                <OwnerPanel wallet={wallet} lots={lots} myOffers={myOffers} onDone={refresh} />
                <h3>Retirar de un lote propio</h3>
                <RetirePanel wallet={wallet} lots={lots} onDone={refresh} />
              </>
            ) : (
              <>
                <p className="lede">Conectá una billetera Freighter en Testnet para ver tus lotes, publicar ofertas o retirar.</p>
                <button className="btn" onClick={connect}>Conectar Freighter</button>
              </>
            )}
          </div>
          <div>
            <h2>Registro de retiros</h2>
            <ul className="ledger">
              {rets.length === 0 && <li className="muted">Todavía no hay retiros.</li>}
              {rets.map((r, i) => (
                <li key={i}>
                  <b className="mono">{fmt(r.amount)} tCO₂e</b>
                  <span>{r.beneficiary}</span>
                  <span className="muted mono">
                    <a href={`#${r.parcel}`} onClick={() => onSelect(r.parcel)}>{lotLabel(r.parcel, r.period)}</a>
                    {" · "}{r.holder === MARKET_ID ? "vía mercado" : short(r.holder, 4)}
                    {" · "}{new Date(Number(r.ledger_time) * 1000).toLocaleDateString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap"><p>El factor que convierte NDVI en tCO₂e es simplificado y no corresponde a una metodología certificada. En esta versión el oráculo es una sola clave y la red es Testnet.</p></div>
      </footer>
    </>
  );
}
