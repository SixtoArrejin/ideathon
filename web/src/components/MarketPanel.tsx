import { useState } from "react";
import { buyAndRetire, type LotInfo, type Offer, type Parcel } from "../chain";
import { PAYMENT_ASSET_CODE } from "../config";
import { fmt, fromUnits, lotLabel, ndvi, short } from "../lib";
import { useUi } from "../ui";

export type OpenOffer = Offer & { id: number };

type Props = {
  wallet: string;
  offers: OpenOffer[];
  parcels: Record<string, Parcel>;
  lotInfo: Record<string, LotInfo | null>;
  onDone: () => void;
};

export default function MarketPanel({ wallet, offers, parcels, lotInfo, onDone }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState("");
  const { connect, transact } = useUi();

  const offer = offers.find((o) => o.id === selected);
  const n = amount ? BigInt(amount) : 0n;
  const tooMuch = !!offer && n > offer.available;
  const total = offer ? n * offer.price_per_ton : 0n;
  const canSubmit = !!offer && n > 0n && !tooMuch && who.trim().length > 1;

  function submit() {
    if (!offer) return;
    const label = lotLabel(offer.parcel, offer.period);
    const name = who.trim();
    transact({
      title: "Confirmar compra y quema",
      lead: "Es una sola transacción: si el pago o la quema fallan, no se cobra ni se quema nada.",
      rows: [
        { label: "Pagás", value: `${fromUnits(total)} ${PAYMENT_ASSET_CODE}` },
        { label: "Al vendedor", value: short(offer.seller, 4) },
        { label: "Se queman", value: `${fmt(n)} t del lote ${label}` },
        { label: "A nombre de", value: name },
      ],
      note: "Vas a ver el detalle completo en Freighter antes de firmar.",
      confirmLabel: "Firmar con Freighter",
      success: `Pagaste ${fromUnits(total)} ${PAYMENT_ASSET_CODE} y se quemaron ${fmt(n)} t del lote ${label} a nombre de ${name}.`,
      context: "market",
      action: () => buyAndRetire(wallet, offer.id, n, name),
      onSuccess: () => { setAmount(""); onDone(); },
    });
  }

  if (offers.length === 0) return <p className="lede">No hay ofertas abiertas en este momento.</p>;

  return (
    <div className="market">
      <div className="tablewrap"><table>
        <thead><tr><th></th><th>Lote</th><th>NDVI del lote</th><th>Disponible</th><th>Precio por t</th><th>Vendedor</th></tr></thead>
        <tbody>
          {offers.map((o) => {
            const info = lotInfo[`${o.parcel}:${o.period}`];
            const frozen = parcels[o.parcel]?.frozen;
            return (
              <tr key={o.id} className={o.id === selected ? "is-selected" : ""}>
                <td><input type="radio" name="offer" aria-label={`Oferta ${o.id}`} checked={o.id === selected} onChange={() => setSelected(o.id)} /></td>
                <td className="mono">
                  <a href={`#${o.parcel}`}>{lotLabel(o.parcel, o.period)}</a>
                  {frozen && <span className="crit"> · predio congelado después</span>}
                </td>
                <td className="mono">{info ? ndvi(info.ndvi_milli) : "…"}</td>
                <td className="mono">{fmt(o.available)} t</td>
                <td className="mono">{fromUnits(o.price_per_ton)} {PAYMENT_ASSET_CODE}</td>
                <td className="mono">{short(o.seller, 4)}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>

      {offer && (
        <div className="retire">
          {parcels[offer.parcel]?.frozen && (
            <p className="msg crit">El predio de este lote quedó congelado en una verificación posterior. Las toneladas de este período se verificaron antes de la caída.</p>
          )}
          <div className="fields">
            <label htmlFor="m-amount">Toneladas a compensar
              <input id="m-amount" inputMode="numeric" value={amount} placeholder={`hasta ${fmt(offer.available)}`} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </label>
            <label htmlFor="m-who">Quién compensa
              <input id="m-who" value={who} maxLength={64} placeholder="Razón social o nombre" onChange={(e) => setWho(e.target.value)} />
            </label>
          </div>
          {tooMuch && <p className="msg crit">La oferta tiene {fmt(offer.available)} t disponibles.</p>}
          {n > 0n && !tooMuch && (
            <p>Pagás <b className="mono">{fromUnits(total)} {PAYMENT_ASSET_CODE}</b> al vendedor y se queman {fmt(n)} t del lote {lotLabel(offer.parcel, offer.period)} a nombre de quien compensa. Todo en una sola transacción.</p>
          )}
          {wallet
            ? <button className="btn" disabled={!canSubmit} onClick={submit}>Comprar y quemar</button>
            : <button className="btn" onClick={() => connect()}>Conectar Freighter para comprar</button>}
        </div>
      )}
    </div>
  );
}
