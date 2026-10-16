import { useEffect, useState } from "react";
import { isConnected, requestAccess } from "@stellar/freighter-api";
import { balanceOf, retire } from "../chain";
import { EXPERT } from "../config";
import { fmt, short } from "../lib";

export default function RetirePanel({ onDone }: { onDone: () => void }) {
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [amount, setAmount] = useState("100");
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (wallet) balanceOf(wallet).then(setBalance).catch(() => setBalance(null));
  }, [wallet, result]);

  async function connect() {
    setResult(null);
    try {
      if (!(await isConnected()).isConnected) throw new Error("No se encontró Freighter. Instalá la extensión y cambiá a la red Testnet.");
      const r = await requestAccess();
      if (r.error) throw new Error(String(r.error.message ?? r.error));
      setWallet(r.address);
    } catch (e) { setResult({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
  }

  const n = amount ? BigInt(amount) : 0n;
  const tooMuch = balance !== null && n > balance;
  const canSubmit = !busy && n > 0n && !tooMuch && who.trim().length > 1;

  async function submit() {
    setBusy(true); setResult(null);
    try {
      const hash = await retire(wallet, n, who.trim());
      setResult({ ok: true, text: hash });
      onDone();
    } catch (e) { setResult({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    setBusy(false);
  }

  return (
    <div className="retire">
      {!wallet ? (
        <>
          <p className="lede">Conectá una billetera Freighter en Testnet que tenga GreenTon. Al retirar, los tokens se queman y el nombre queda en el registro público.</p>
          <button className="btn" onClick={connect}>Conectar Freighter</button>
        </>
      ) : (
        <>
          <dl className="kv">
            <div><dt>Billetera</dt><dd className="mono">{short(wallet)}</dd></div>
            <div><dt>Saldo</dt><dd className="mono">{balance === null ? "…" : `${fmt(balance)} GTON`}</dd></div>
          </dl>
          <div className="fields">
            <label htmlFor="amount">Toneladas a retirar
              <input id="amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </label>
            <label htmlFor="who">Quién compensa
              <input id="who" value={who} maxLength={64} placeholder="Razón social o nombre" onChange={(e) => setWho(e.target.value)} />
            </label>
          </div>
          {tooMuch && <p className="msg crit">El saldo no alcanza para retirar {fmt(n)} tCO₂e.</p>}
          <button className="btn" disabled={!canSubmit} onClick={submit}>{busy ? "Esperando la firma…" : "Retirar y quemar"}</button>
        </>
      )}
      {result && (result.ok
        ? <p className="msg ok">Retiro confirmado. <a href={`${EXPERT}/tx/${result.text}`} target="_blank" rel="noreferrer">Ver la transacción</a></p>
        : <p className="msg crit">{result.text}</p>)}
    </div>
  );
}
