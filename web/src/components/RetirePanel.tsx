import { useEffect, useState } from "react";
import { retire, type LotBalance } from "../chain";
import { fmt, lotLabel } from "../lib";
import { useUi } from "../ui";

const key = (l: LotBalance) => `${l.parcel}:${l.period}`;

export default function RetirePanel({ wallet, lots, onDone }: { wallet: string; lots: LotBalance[]; onDone: () => void }) {
  const { transact } = useUi();
  const [lotKey, setLotKey] = useState("");
  const [amount, setAmount] = useState("100");
  const [who, setWho] = useState("");

  useEffect(() => {
    if (!lots.some((l) => key(l) === lotKey)) setLotKey(lots[0] ? key(lots[0]) : "");
  }, [lots, lotKey]);

  const lot = lots.find((l) => key(l) === lotKey);
  const n = amount ? BigInt(amount) : 0n;
  const tooMuch = !!lot && n > lot.amount;
  const canSubmit = !!lot && n > 0n && !tooMuch && who.trim().length > 1;

  function submit() {
    if (!lot) return;
    const label = lotLabel(lot.parcel, lot.period);
    transact({
      title: "Confirmar retiro",
      lead: "Vas a quemar toneladas de un lote propio para certificar una compensación. No se puede deshacer.",
      rows: [
        { label: "Lote", value: label },
        { label: "Se queman", value: `${fmt(n)} t` },
        { label: "A nombre de", value: who.trim() },
      ],
      note: "El retiro queda en el registro público con el lote de origen.",
      confirmLabel: "Firmar con Freighter",
      success: `Se quemaron ${fmt(n)} t del lote ${label} a nombre de ${who.trim()}.`,
      context: "greenton",
      action: () => retire(wallet, lot.parcel, lot.period, n, who.trim()),
      onSuccess: onDone,
    });
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
      <button className="btn" disabled={!canSubmit} onClick={submit}>Retirar y quemar</button>
    </div>
  );
}
