import { useState } from "react";
import { cancel, list, retire, type LotBalance } from "../chain";
import CopyButton from "../components/CopyButton";
import Modal from "../components/Modal";
import { EXPERT, PAYMENT_ASSET_CODE } from "../config";
import { useData, type OpenOffer } from "../data";
import { fmt, fromUnits, lotLabel, short, toUnits } from "../lib";
import { hrefFor } from "../router";
import { useUi } from "../ui";

type Action = { mode: "offer" | "retire"; lot: LotBalance };

function LotModal({ action, onClose }: { action: Action | null; onClose: () => void }) {
  const { wallet, transact } = useUi();
  const { refresh } = useData();
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [who, setWho] = useState("");

  if (!action) return <Modal open={false} title="" onClose={onClose}>{null}</Modal>;
  const { mode, lot } = action;
  const label = lotLabel(lot.parcel, lot.period);
  const n = amount ? BigInt(amount) : 0n;
  const unit = toUnits(price);
  const tooMuch = n > lot.amount;
  const ok = n > 0n && !tooMuch && (mode === "offer" ? !!unit && unit > 0n : who.trim().length > 1);

  function next() {
    onClose();
    if (mode === "offer" && unit) {
      transact({
        title: "Confirmar oferta",
        lead: "Las toneladas pasan a custodia del mercado hasta que se vendan o vos canceles la oferta.",
        rows: [
          { label: "Lote", value: label },
          { label: "Toneladas", value: `${fmt(n)} t` },
          { label: "Precio", value: `${fromUnits(unit)} ${PAYMENT_ASSET_CODE} por tonelada` },
          { label: "Total si se vende todo", value: `${fromUnits(unit * n)} ${PAYMENT_ASSET_CODE}` },
        ],
        note: "Mientras la oferta esté abierta, esas toneladas no aparecen en tu cuenta.",
        confirmLabel: "Firmar con Freighter",
        success: `Publicaste ${fmt(n)} t del lote ${label}. Ya aparecen en el mercado.`,
        context: "market",
        action: () => list(wallet, lot.parcel, lot.period, n, unit),
        onSuccess: refresh,
      });
    } else {
      const name = who.trim();
      transact({
        title: "Confirmar retiro",
        lead: "Vas a quemar toneladas de un lote propio para certificar una compensación. No se puede deshacer.",
        rows: [
          { label: "Lote", value: label },
          { label: "Se queman", value: `${fmt(n)} t` },
          { label: "A nombre de", value: name },
        ],
        note: "El retiro queda en el registro público con el lote de origen.",
        confirmLabel: "Firmar con Freighter",
        success: `Se quemaron ${fmt(n)} t del lote ${label} a nombre de ${name}.`,
        context: "greenton",
        action: () => retire(wallet, lot.parcel, lot.period, n, name),
        onSuccess: refresh,
      });
    }
  }

  return (
    <Modal open title={mode === "offer" ? `Ofrecer lote ${label}` : `Retirar lote ${label}`} onClose={onClose} actions={
      <>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={!ok} onClick={next}>Continuar</button>
      </>
    }>
      <p>{mode === "offer" ? `Tenés ${fmt(lot.amount)} t de este lote. Elegí cuántas ofrecer y a qué precio.` : `Tenés ${fmt(lot.amount)} t de este lote. Retirar las quema para siempre.`}</p>
      <div className="fields">
        <label htmlFor="l-amount">Toneladas
          <input id="l-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))} />
        </label>
        {mode === "offer" ? (
          <label htmlFor="l-price">Precio por tonelada ({PAYMENT_ASSET_CODE})
            <input id="l-price" inputMode="decimal" value={price} placeholder="15" onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, "").slice(0, 16))} />
          </label>
        ) : (
          <label htmlFor="l-who">Quién compensa
            <input id="l-who" value={who} maxLength={64} placeholder="Razón social o nombre" onChange={(e) => setWho(e.target.value)} />
          </label>
        )}
      </div>
      {tooMuch && <p className="msg crit">El lote tiene {fmt(lot.amount)} t.</p>}
    </Modal>
  );
}

export default function Account() {
  const { wallet, connecting, connect, disconnect, transact } = useUi();
  const { lots, myOffers, refresh } = useData();
  const [action, setAction] = useState<Action | null>(null);

  if (!wallet) {
    return (
      <div className="wrap page-pad">
        <header className="page-head">
          <p className="kicker">Mi cuenta</p>
          <h1>Tus lotes, tus ofertas, tus retiros</h1>
        </header>
        <div className="gate">
          <p className="lead">Conectá Freighter en Testnet para ver los lotes de tu cuenta, ofrecerlos en el mercado o retirarlos. Para mirar el resto de Dosel no hace falta billetera.</p>
          <ul className="can">
            <li><b>Si sos propietario</b> vas a ver los lotes que el oráculo emitió para tus predios.</li>
            <li><b>Si sos comprador</b> podés comprar y quemar directamente desde el <a href={hrefFor("mercado")}>mercado</a>.</li>
          </ul>
          <button className="btn" disabled={connecting} onClick={() => connect()}>{connecting ? "Buscando Freighter…" : "Conectar billetera"}</button>
        </div>
      </div>
    );
  }

  function cancelOffer(o: OpenOffer) {
    const label = lotLabel(o.parcel, o.period);
    transact({
      title: "Cancelar oferta",
      lead: "La oferta se cierra y las toneladas que no se vendieron vuelven a tu cuenta.",
      rows: [{ label: "Lote", value: label }, { label: "Vuelven a tu cuenta", value: `${fmt(o.available)} t` }],
      confirmLabel: "Firmar con Freighter",
      success: `Cancelaste la oferta. ${fmt(o.available)} t del lote ${label} volvieron a tu cuenta.`,
      context: "market",
      action: () => cancel(wallet, o.id),
      onSuccess: refresh,
    });
  }

  const inCustody = myOffers.reduce((s, o) => s + o.available, 0n);

  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Mi cuenta</p>
        <h1>Tus lotes, tus ofertas, tus retiros</h1>
        <p className="who"><span className="dot" aria-hidden="true" /> <span className="mono">{short(wallet, 8)}</span>
          <CopyButton text={wallet} label="Copiar" />
          <a className="copy" href={`${EXPERT}/account/${wallet}`} target="_blank" rel="noreferrer">Stellar Expert ↗</a>
          <button className="copy" onClick={disconnect}>Desconectar</button>
        </p>
      </header>

      <section className="section-tight">
        <h2>Mis lotes</h2>
        {lots.length === 0 ? (
          <div className="empty">
            <h3>Esta billetera no tiene lotes</h3>
            <p className="muted">Los lotes los emite el oráculo al propietario de un predio. Si querés compensar sin tener tokens, comprá y quemá desde el <a href={hrefFor("mercado")}>mercado</a>.</p>
          </div>
        ) : (
          <ul className="lots">
            {lots.map((l) => (
              <li key={`${l.parcel}:${l.period}`} className="lotcard">
                <span className="mono lot">{lotLabel(l.parcel, l.period)}</span>
                <p className="big"><b className="mono">{fmt(l.amount)}</b> <span className="muted">GTON</span></p>
                <div className="row">
                  <button className="btn small" onClick={() => setAction({ mode: "offer", lot: l })}>Ofrecer</button>
                  <button className="btn small ghost" onClick={() => setAction({ mode: "retire", lot: l })}>Retirar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {inCustody > 0n && <p className="muted small">Además, {fmt(inCustody)} GTON están en custodia del mercado por tus ofertas abiertas.</p>}
      </section>

      <section className="section-tight">
        <h2>Mis ofertas abiertas</h2>
        {myOffers.length === 0 ? <p className="muted">No tenés ofertas abiertas.</p> : (
          <ul className="ledger">
            {myOffers.map((o) => (
              <li key={o.id}>
                <b className="mono">{fmt(o.available)} t · {lotLabel(o.parcel, o.period)}</b>
                <span className="muted mono">{fromUnits(o.price_per_ton)} {PAYMENT_ASSET_CODE} por tonelada</span>
                <span><button className="copy" onClick={() => cancelOffer(o)}>Cancelar oferta</button></span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <LotModal key={action ? `${action.mode}:${action.lot.parcel}:${action.lot.period}` : "none"} action={action} onClose={() => setAction(null)} />
    </div>
  );
}
