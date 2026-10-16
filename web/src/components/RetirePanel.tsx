import { useEffect, useState } from "react";
import { retire, type LotBalance } from "../chain";
import { EXPERT } from "../config";
import { fmt, lotLabel } from "../lib";
import { errText } from "../wallet";

const key = (l: LotBalance) => `${l.parcel}:${l.period}`;

export default function RetirePanel({ wallet, lots, onDone }: { wallet: string; lots: LotBalance[]; onDone: () => void }) {
  const [lotKey, setLotKey] = useState("");
  const [amount, setAmount] = useState("100");
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!lots.some((l) => key(l) === lotKey)) setLotKey(lots[0] ? key(lots[0]) : "");
  }, [lots, lotKey]);

  const lot = lots.find((l) => key(l) === lotKey);
  const n = amount ? BigInt(amount) : 0n;
  const tooMuch = !!lot && n > lot.amount;
  const canSubmit = !busy && !!lot && n > 0n && !tooMuch && who.trim().length > 1;

  async function submit() {
    if (!lot) return;
    setBusy(true); setResult(null);
    try {
      const hash = await retire(wallet, lot.parcel, lot.period, n, who.trim());
      setResult({ ok: true, text: hash });
      onDone();
    } catch (e) { setResult({ ok: false, text: errText(e) }); }
    setBusy(false);
  }

  if (lots.length === 0) {
    return <p className="lede">Esta billetera no tiene lotes de GreenTon. Para compensar sin tener tokens, comprá y quemá desde el mercado.</p>;
  }

  return (
    <div className="retire">
      <div className="fields">
        <label htmlFor="r-lot">Lote
          <select id="r-lot" value={lotKey} onChange={(e) => setLotKey(e.target.value)}>
            {lots.map((l) => <option key={key(l)} value={key(l)}>{lotLabel(l.parcel, l.period)} · {fmt(l.amount)} GTON</option>)}
          </select>
        </label>
        <label htmlFor="r-amount">Toneladas a retirar
          <input id="r-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
        </label>
        <label htmlFor="r-who">Quién compensa
          <input id="r-who" value={who} maxLength={64} placeholder="Razón social o nombre" onChange={(e) => setWho(e.target.value)} />
        </label>
      </div>
      {tooMuch && <p className="msg crit">El lote no alcanza para retirar {fmt(n)} tCO₂e.</p>}
      <button className="btn" disabled={!canSubmit} onClick={submit}>{busy ? "Esperando la firma…" : "Retirar y quemar"}</button>
      {result && (result.ok
        ? <p className="msg ok">Retiro confirmado. <a href={`${EXPERT}/tx/${result.text}`} target="_blank" rel="noreferrer">Ver la transacción</a></p>
        : <p className="msg crit">{result.text}</p>)}
    </div>
  );
}
