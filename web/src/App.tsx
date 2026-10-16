import { useCallback, useEffect, useState } from "react";
import { isConnected, requestAccess } from "@stellar/freighter-api";
import {
  balanceOf, getParcel, getRetirement, retire, retirementCount, totalRetired, totalSupply,
  type Parcel, type Retirement,
} from "./chain";
import { CONTRACT_ID, EXPERT, PARCEL_IDS } from "./config";

type Verification = {
  parcel: string; period: number; ndvi: number; scene: string; scene_date: string;
  hectares: number; tco2e_proposed: number; minted: string | number; tx: string;
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;
const fmt = (n: bigint | number) => Number(n).toLocaleString("es-AR");

export default function App() {
  const [supply, setSupply] = useState<bigint>(0n);
  const [retired, setRetired] = useState<bigint>(0n);
  const [parcels, setParcels] = useState<Record<string, Parcel>>({});
  const [ver, setVer] = useState<Verification[]>([]);
  const [rets, setRets] = useState<Retirement[]>([]);
  const [wallet, setWallet] = useState<string>("");
  const [balance, setBalance] = useState<bigint>(0n);
  const [amount, setAmount] = useState("100");
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, r, n] = await Promise.all([totalSupply(), totalRetired(), retirementCount()]);
      setSupply(s); setRetired(r);
      const ps = await Promise.all(PARCEL_IDS.map(async (id) => [id, await getParcel(id)] as const));
      setParcels(Object.fromEntries(ps));
      const list = await Promise.all(Array.from({ length: Number(n) }, (_, i) => getRetirement(i)));
      setRets(list.filter((x): x is Retirement => !!x).reverse());
      setErr("");
    } catch (e) { setErr(String(e)); }
  }, []);

  useEffect(() => {
    load();
    fetch("/verifications.json").then((r) => r.json()).then(setVer).catch(() => {});
  }, [load]);

  useEffect(() => { if (wallet) balanceOf(wallet).then(setBalance).catch(() => {}); }, [wallet, rets]);

  async function connect() {
    try {
      if (!(await isConnected()).isConnected) throw new Error("Instalá la extensión Freighter y usá la red Testnet.");
      const r = await requestAccess();
      if (r.error) throw new Error(String(r.error.message ?? r.error));
      setWallet(r.address);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
  }

  async function doRetire() {
    setBusy(true); setMsg(null);
    try {
      const hash = await retire(wallet, BigInt(amount), who.trim());
      setMsg({ ok: true, text: hash });
      await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    setBusy(false);
  }

  const frozenCount = Object.values(parcels).filter((p) => p.frozen).length;

  return (
    <main>
      <header>
        <h1>🌳 CarbonTrack NEA</h1>
        <p>Créditos de carbono de bosque nativo verificados por satélite y retirados on-chain en Stellar.</p>
        <p className="sub">
          Contrato <a href={`${EXPERT}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">{short(CONTRACT_ID)}</a> · Testnet
        </p>
      </header>

      {err && <p className="error">No se pudo leer la red: {err}</p>}

      <section className="stats">
        <div><b>{fmt(supply)}</b><span>GreenTon en circulación (1 = 1 tCO₂e)</span></div>
        <div><b>{fmt(retired)}</b><span>tCO₂e retiradas (quemadas)</span></div>
        <div><b>{frozenCount}</b><span>predios congelados por el satélite</span></div>
      </section>

      <h2>Predios</h2>
      <section className="cards">
        {PARCEL_IDS.map((id) => {
          const p = parcels[id];
          if (!p) return <article key={id}>Cargando {id}…</article>;
          const vs = ver.filter((v) => v.parcel === id);
          return (
            <article key={id} className={p.frozen ? "frozen" : ""}>
              <h3>{id} <em className={p.frozen ? "tag bad" : "tag ok"}>{p.frozen ? "CONGELADO" : "ACTIVO"}</em></h3>
              <p>{fmt(p.hectares)} ha · bbox <code>{p.bbox}</code></p>
              <p>NDVI línea base <b>{(p.baseline_ndvi_milli / 1000).toFixed(3)}</b> → último <b>{(p.last_ndvi_milli / 1000).toFixed(3)}</b></p>
              <p>Emitido: <b>{fmt(p.issued_tco2e)}</b> tCO₂e</p>
              <ul>
                {vs.map((v) => (
                  <li key={v.tx}>
                    Período {v.period}: NDVI {v.ndvi} · escena <code>{v.scene.slice(0, 26)}…</code> ({v.scene_date}) ·{" "}
                    {Number(v.minted) > 0 ? `+${fmt(Number(v.minted))} GTON` : "sin emisión"} ·{" "}
                    <a href={`${EXPERT}/tx/${v.tx}`} target="_blank" rel="noreferrer">tx</a>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <h2>Retirar créditos (compensar huella)</h2>
      <section className="panel">
        {!wallet ? (
          <button onClick={connect}>Conectar Freighter</button>
        ) : (
          <>
            <p>Billetera <code>{short(wallet)}</code> · saldo <b>{fmt(balance)}</b> GTON</p>
            <label>Cantidad (tCO₂e)<input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></label>
            <label>Quién compensa<input value={who} placeholder="Nombre de la empresa" onChange={(e) => setWho(e.target.value)} /></label>
            <button disabled={busy || !amount || !who.trim()} onClick={doRetire}>{busy ? "Firmando…" : "Retirar (quemar)"}</button>
          </>
        )}
        {msg && (msg.ok
          ? <p className="okmsg">✅ Retirado. <a href={`${EXPERT}/tx/${msg.text}`} target="_blank" rel="noreferrer">Ver transacción</a></p>
          : <p className="error">{msg.text}</p>)}
      </section>

      <h2>Registro público de retiros</h2>
      <ul className="rets">
        {rets.length === 0 && <li>Todavía no hay retiros.</li>}
        {rets.map((r, i) => (
          <li key={i}><b>{fmt(r.amount)}</b> tCO₂e · {r.beneficiary} · <code>{short(r.holder)}</code> · {new Date(Number(r.ledger_time) * 1000).toLocaleString("es-AR")}</li>
        ))}
      </ul>

      <footer>
        Factor de conversión NDVI→tCO₂e simplificado e ilustrativo (no es una metodología certificada).
        El oráculo es una única clave en esta versión.
      </footer>
    </main>
  );
}
