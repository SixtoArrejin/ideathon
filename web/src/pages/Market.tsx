import { useEffect, useState } from "react";
import { buyAndRetire } from "../chain";
import Modal from "../components/Modal";
import { PAYMENT_ASSET_CODE } from "../config";
import { useData, type OpenOffer } from "../data";
import { fmt, fromUnits, lotLabel, ndvi, pct, short, splitFee } from "../lib";
import { hrefFor } from "../router";
import { useUi } from "../ui";

function BuyModal({ offer, onClose }: { offer: OpenOffer | null; onClose: () => void }) {
  const { wallet, transact } = useUi();
  const { refresh, fee: feeRate } = useData();
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState("");

  useEffect(() => {
    if (offer) setAmount((offer.available < 100n ? offer.available : 100n).toString());
  }, [offer]);

  if (!offer) return <Modal open={false} title="" onClose={onClose}>{null}</Modal>;
  const n = amount ? BigInt(amount) : 0n;
  const tooMuch = n > offer.available;
  const total = n * offer.price_per_ton;
  const { fee: commission, net } = splitFee(total, feeRate);
  const label = lotLabel(offer.parcel, offer.period);
  const ok = n > 0n && !tooMuch && who.trim().length > 1;

  function next() {
    if (!offer) return;
    const name = who.trim();
    onClose();
    transact({
      title: "Confirmar compra y quema",
      lead: "Es una sola transacción: si el pago o la quema fallan, no se cobra ni se quema nada.",
      rows: [
        { label: "Pagás", value: `${fromUnits(total)} ${PAYMENT_ASSET_CODE}` },
        { label: feeRate > 0 ? "Al vendedor (neto)" : "Al vendedor", value: `${fromUnits(net)} ${PAYMENT_ASSET_CODE} · ${short(offer.seller, 4)}` },
        ...(feeRate > 0 ? [{ label: `Comisión de la plataforma (${pct(feeRate)})`, value: `${fromUnits(commission)} ${PAYMENT_ASSET_CODE}` }] : []),
        { label: "Se queman", value: `${fmt(n)} t del lote ${label}` },
        { label: "A nombre de", value: name },
      ],
      note: "Vas a ver el detalle completo en Freighter antes de firmar.",
      confirmLabel: "Firmar con Freighter",
      success: `Pagaste ${fromUnits(total)} ${PAYMENT_ASSET_CODE} y se quemaron ${fmt(n)} t del lote ${label} a nombre de ${name}.`,
      context: "market",
      action: () => buyAndRetire(wallet, offer.id, n, name),
      onSuccess: refresh,
    });
  }

  return (
    <Modal open title={`Comprar lote ${label}`} onClose={onClose} actions={
      <>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={!ok} onClick={next}>Continuar</button>
      </>
    }>
      <p>Hay {fmt(offer.available)} t disponibles a {fromUnits(offer.price_per_ton)} {PAYMENT_ASSET_CODE} por tonelada. Lo que compres se quema a nombre de quien compensa.</p>
      <div className="fields">
        <label htmlFor="b-amount">Toneladas a compensar
          <input id="b-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
        </label>
        <label htmlFor="b-who">Quién compensa
          <input id="b-who" value={who} maxLength={64} placeholder="Razón social o nombre" onChange={(e) => setWho(e.target.value)} />
        </label>
      </div>
      {tooMuch
        ? <p className="msg crit">La oferta tiene {fmt(offer.available)} t disponibles.</p>
        : n > 0n && (
          <p className="total">
            Total a pagar <b className="mono">{fromUnits(total)} {PAYMENT_ASSET_CODE}</b>
            {feeRate > 0 && <span className="muted small"> · al vendedor {fromUnits(net)} · comisión de la plataforma {fromUnits(commission)} ({pct(feeRate)})</span>}
          </p>
        )}
    </Modal>
  );
}

export default function Market() {
  const { offers, parcels, lotInfo, loaded } = useData();
  const { wallet, connect } = useUi();
  const [buying, setBuying] = useState<OpenOffer | null>(null);

  async function startBuy(o: OpenOffer) {
    if (!wallet && !(await connect())) return;
    setBuying(o);
  }

  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Mercado</p>
        <h1>Comprar es compensar</h1>
        <p className="lead">Cada oferta es un lote concreto. Al comprar, el mercado cobra, le paga al dueño y quema las toneladas a nombre de quien compensa, todo en la misma transacción.</p>
      </header>

      {!loaded ? (
        <ul className="offers" aria-busy="true" aria-label="Leyendo las ofertas">
          {[0, 1].map((i) => <li key={i} className="offer skeleton" aria-hidden="true"><i /><i /><i /><i /></li>)}
        </ul>
      ) : offers.length === 0 ? (
        <div className="empty">
          <h3>No hay ofertas abiertas</h3>
          <p className="muted">Cuando un propietario publique toneladas de un lote, van a aparecer acá.</p>
        </div>
      ) : (
        <ul className="offers">
          {offers.map((o) => {
            const info = lotInfo[`${o.parcel}:${o.period}`];
            const frozen = parcels[o.parcel]?.frozen;
            return (
              <li key={o.id} className="offer">
                <header>
                  <a className="mono lot" href={hrefFor("predios", o.parcel)}>{lotLabel(o.parcel, o.period)}</a>
                  <span className="muted small">Oferta {o.id}</span>
                </header>
                <p className="price"><b className="mono">{fromUnits(o.price_per_ton)}</b> {PAYMENT_ASSET_CODE} <span className="muted">por tonelada</span></p>
                <dl className="kv tight">
                  <div><dt>Disponible</dt><dd className="mono">{fmt(o.available)} t</dd></div>
                  <div><dt>NDVI del lote</dt><dd className="mono">{info ? ndvi(info.ndvi_milli) : "…"}</dd></div>
                  <div><dt>Vendedor</dt><dd className="mono">{short(o.seller, 4)}</dd></div>
                </dl>
                {frozen && <p className="msg crit small">El predio se congeló después de verificar este lote. Las toneladas son de un período anterior a la caída.</p>}
                <button className="btn" onClick={() => startBuy(o)}>Comprar y quemar</button>
              </li>
            );
          })}
        </ul>
      )}
      <BuyModal offer={buying} onClose={() => setBuying(null)} />
    </div>
  );
}
