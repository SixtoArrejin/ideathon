import { useEffect, useState } from "react";
import { cancel, list, type LotBalance } from "../chain";
import { EXPERT, PAYMENT_ASSET_CODE } from "../config";
import { fmt, fromUnits, lotLabel, toUnits } from "../lib";
import { errText } from "../wallet";
import type { OpenOffer } from "./MarketPanel";

const key = (l: LotBalance) => `${l.parcel}:${l.period}`;

type Props = { wallet: string; lots: LotBalance[]; myOffers: OpenOffer[]; onDone: () => void };

export default function OwnerPanel({ wallet, lots, myOffers, onDone }: Props) {
  const [lotKey, setLotKey] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);

  useEffect(() => {
    if (!lots.some((l) => key(l) === lotKey)) setLotKey(lots[0] ? key(lots[0]) : "");
  }, [lots, lotKey]);

  const lot = lots.find((l) => key(l) === lotKey);
  const n = amount ? BigInt(amount) : 0n;
  const unitPrice = toUnits(price);
  const tooMuch = !!lot && n > lot.amount;
  const canList = !busy && !!lot && n > 0n && !tooMuch && !!unitPrice && unitPrice > 0n;
  const inCustody = myOffers.reduce((s, o) => s + o.available, 0n);

  async function run(action: () => Promise<string>, ok: string) {
    setBusy(true); setResult(null);
    try {
      const hash = await action();
      setResult({ ok: true, text: ok, hash });
      onDone();
    } catch (e) { setResult({ ok: false, text: errText(e) }); }
    setBusy(false);
  }

  return (
    <div className="retire">
      <h3>Mis lotes</h3>
      {lots.length === 0
        ? <p className="muted">Esta billetera no tiene lotes en su cuenta.</p>
        : <ul className="ledger">{lots.map((l) => <li key={key(l)}><b className="mono">{fmt(l.amount)} GTON</b><span className="mono">{lotLabel(l.parcel, l.period)}</span></li>)}</ul>}
      {inCustody > 0n && <p className="muted">Además, {fmt(inCustody)} GTON están en custodia del mercado por tus ofertas abiertas. Vuelven a tu cuenta si cancelás.</p>}

      {lots.length > 0 && (
        <>
          <h3>Publicar una oferta</h3>
          <div className="fields">
            <label htmlFor="o-lot">Lote
              <select id="o-lot" value={lotKey} onChange={(e) => setLotKey(e.target.value)}>
                {lots.map((l) => <option key={key(l)} value={key(l)}>{lotLabel(l.parcel, l.period)} · {fmt(l.amount)} GTON</option>)}
              </select>
            </label>
            <label htmlFor="o-amount">Toneladas
              <input id="o-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </label>
            <label htmlFor="o-price">Precio por tonelada ({PAYMENT_ASSET_CODE})
              <input id="o-price" inputMode="decimal" value={price} placeholder="15" onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, "").slice(0, 16))} />
            </label>
          </div>
          {tooMuch && <p className="msg crit">El lote tiene {fmt(lot!.amount)} GTON.</p>}
          <button className="btn" disabled={!canList} onClick={() => run(() => list(wallet, lot!.parcel, lot!.period, n, unitPrice!), "Oferta publicada.")}>
            {busy ? "Esperando la firma…" : "Publicar y poner en custodia"}
          </button>
        </>
      )}

      {myOffers.length > 0 && (
        <>
          <h3>Mis ofertas abiertas</h3>
          <ul className="ledger">
            {myOffers.map((o) => (
              <li key={o.id}>
                <b className="mono">{fmt(o.available)} t</b>
                <span className="mono">{lotLabel(o.parcel, o.period)} · {fromUnits(o.price_per_ton)} {PAYMENT_ASSET_CODE}/t</span>
                <button className="copy" disabled={busy} onClick={() => run(() => cancel(wallet, o.id), "Oferta cancelada.")}>Cancelar</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {result && (result.ok
        ? <p className="msg ok">{result.text} <a href={`${EXPERT}/tx/${result.hash}`} target="_blank" rel="noreferrer">Ver la transacción</a></p>
        : <p className="msg crit">{result.text}</p>)}
    </div>
  );
}
