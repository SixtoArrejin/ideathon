import { useEffect, useMemo, useState } from "react";
import { cancel, getLot, list, retire, type LotBalance, type LotInfo } from "../chain";
import CopyButton from "../components/CopyButton";
import Modal from "../components/Modal";
import { EXPERT, PAYMENT_ASSET_CODE } from "../config";
import { useData, type OpenOffer } from "../data";
import { fmt, fromUnits, lotLabel, ndvi, PARCEL_LABELS, pct, short, splitFee, toUnits } from "../lib";
import { hrefFor } from "../router";
import { useUi } from "../ui";

type Action = { mode: "offer" | "retire"; lot: LotBalance };
const FRIENDBOT = "https://lab.stellar.org/account/fund";

/** Saldo de XLM de la cuenta en Testnet, para saber si alcanza para comprar. */
function useXlm(wallet: string) {
  const [state, setState] = useState<{ xlm: number | null; funded: boolean | null }>({ xlm: null, funded: null });
  useEffect(() => {
    let live = true;
    setState({ xlm: null, funded: null });
    fetch(`https://horizon-testnet.stellar.org/accounts/${wallet}`, { signal: AbortSignal.timeout(10000) })
      .then(async (r) => {
        if (r.status === 404) return live && setState({ xlm: 0, funded: false });
        const j = await r.json();
        const n = j.balances?.find((b: { asset_type: string }) => b.asset_type === "native");
        if (live) setState({ xlm: n ? Number(n.balance) : 0, funded: true });
      })
      .catch(() => { if (live) setState({ xlm: null, funded: null }); });
    return () => { live = false; };
  }, [wallet]);
  return state;
}

function LotModal({ action, onClose }: { action: Action | null; onClose: () => void }) {
  const { wallet, transact } = useUi();
  const { refresh, fee: feeRate } = useData();
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
          ...(feeRate > 0 ? [
            { label: `Comisión de la plataforma (${pct(feeRate)})`, value: `${fromUnits(splitFee(unit * n, feeRate).fee)} ${PAYMENT_ASSET_CODE}` },
            { label: "Recibís, neto", value: `${fromUnits(splitFee(unit * n, feeRate).net)} ${PAYMENT_ASSET_CODE}` },
          ] : []),
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
      {mode === "offer" && feeRate > 0 && <p className="muted small">La plataforma retiene {pct(feeRate)} de cada venta, calculado sobre el total que paga el comprador.</p>}
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
  const { lots, myOffers, refresh, lotsLoaded, parcels, rets, purchases } = useData();
  const [action, setAction] = useState<Action | null>(null);
  const [infos, setInfos] = useState<Record<string, LotInfo | null>>({});
  const xlm = useXlm(wallet);

  useEffect(() => {
    let live = true;
    Promise.all(lots.map(async (l) => [`${l.parcel}:${l.period}`, await getLot(l.parcel, l.period).catch(() => null)] as const))
      .then((r) => { if (live) setInfos(Object.fromEntries(r)); });
    return () => { live = false; };
  }, [lots]);

  const held = useMemo(() => lots.reduce((s, l) => s + l.amount, 0n), [lots]);
  const custody = useMemo(() => myOffers.reduce((s, o) => s + o.available, 0n), [myOffers]);
  // Retiros propios: los que quemó esta cuenta y los de compras hechas en el mercado (ahí el titular al quemar es el mercado).
  const purchaseOf = useMemo(() => new Map(purchases.filter((p) => p.buyer === wallet).map((p) => [p.retirement_id, p])), [purchases, wallet]);
  const mine = useMemo(() => rets.filter((r) => r.holder === wallet || purchaseOf.has(r.id)), [rets, wallet, purchaseOf]);
  const burned = useMemo(() => mine.reduce((s, r) => s + r.amount, 0n), [mine]);

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

  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Mi cuenta</p>
        <h1>Tus lotes, tus ofertas, tus retiros</h1>
        <p className="who"><span className="dot" aria-hidden="true" /> <span className="mono" title={wallet}>{short(wallet, 8)}</span>
          <CopyButton text={wallet} label="Copiar" />
          <a className="copy" href={`${EXPERT}/account/${wallet}`} target="_blank" rel="noreferrer">Stellar Expert ↗</a>
          <button className="copy" onClick={disconnect}>Desconectar</button>
        </p>
      </header>

      <dl className="figures acct">
        <div><dt>GTON en tu cuenta</dt><dd>{lotsLoaded ? fmt(held) : "…"}</dd><small>{lotsLoaded ? `en ${lots.length} ${lots.length === 1 ? "lote" : "lotes"}` : "leyendo la red"}</small></div>
        <div><dt>En custodia del mercado</dt><dd>{lotsLoaded ? fmt(custody) : "…"}</dd><small>{myOffers.length} {myOffers.length === 1 ? "oferta abierta" : "ofertas abiertas"}</small></div>
        <div><dt>XLM para comprar</dt><dd>{xlm.xlm === null ? "…" : xlm.xlm.toLocaleString("es-AR", { maximumFractionDigits: 1 })}</dd>
          <small>{xlm.funded === false ? <>Cuenta sin fondear. <a href={FRIENDBOT} target="_blank" rel="noreferrer">Cargá XLM de prueba ↗</a></> : "saldo en Testnet"}</small></div>
      </dl>

      <section className="section-tight">
        <h2>Mis lotes</h2>
        {!lotsLoaded ? (
          <p className="muted">Leyendo tus lotes en la red…</p>
        ) : lots.length === 0 ? (
          <div className="empty">
            <h3>Esta billetera no tiene lotes</h3>
            <p className="muted">Los lotes los emite el oráculo al propietario de un predio. Para compensar sin tener tokens, comprá y quemá desde el <a href={hrefFor("mercado")}>mercado</a>.</p>
            <a className="btn small" href={hrefFor("mercado")}>Ir al mercado</a>
          </div>
        ) : (
          <ul className="lots">
            {lots.map((l) => {
              const info = infos[`${l.parcel}:${l.period}`];
              const frozen = parcels[l.parcel]?.frozen;
              return (
                <li key={`${l.parcel}:${l.period}`} className="lotcard">
                  <header>
                    <a className="mono lot" href={hrefFor("predios", l.parcel)}>{lotLabel(l.parcel, l.period)}</a>
                    <span className={`tagp ${frozen ? "crit" : "ok"}`}>{frozen ? "Predio congelado" : "Predio activo"}</span>
                  </header>
                  <p className="big"><b className="mono">{fmt(l.amount)}</b> <span className="muted">GTON</span></p>
                  <p className="muted small">{PARCEL_LABELS[l.parcel]?.name}{info ? ` · NDVI del lote ${ndvi(info.ndvi_milli)} · emitido ${fmt(info.minted)} t` : ""}</p>
                  <div className="row">
                    <button className="btn small" onClick={() => setAction({ mode: "offer", lot: l })}>Ofrecer</button>
                    <button className="btn small ghost" onClick={() => setAction({ mode: "retire", lot: l })}>Retirar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section-tight">
        <h2>Mis ofertas abiertas</h2>
        {!lotsLoaded ? <p className="muted">Leyendo tus ofertas…</p> : myOffers.length === 0 ? (
          <p className="muted">No tenés ofertas abiertas. Ofrecé un lote desde la lista de arriba y aparece en el <a href={hrefFor("mercado")}>mercado</a>.</p>
        ) : (
          <ul className="ledger">
            {myOffers.map((o) => (
              <li key={o.id} className="line">
                <div>
                  <b className="mono">{fmt(o.available)} t · {lotLabel(o.parcel, o.period)}</b>
                  <span className="muted small">{fromUnits(o.price_per_ton)} {PAYMENT_ASSET_CODE} por tonelada · total {fromUnits(o.price_per_ton * o.available)} {PAYMENT_ASSET_CODE}</span>
                </div>
                <button className="copy" onClick={() => cancelOffer(o)}>Cancelar oferta</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-tight">
        <h2>Mis retiros</h2>
        {mine.length === 0 ? (
          <p className="muted">Todavía no compensaste desde esta cuenta. Cuando retires un lote propio, o compres y quemes en el <a href={hrefFor("mercado")}>mercado</a>, tu certificado aparece acá.</p>
        ) : (
          <>
            <p className="muted small">{fmt(burned)} tCO₂e quemadas desde esta cuenta.</p>
            <ul className="ledger">
              {mine.map((r) => {
                const buy = purchaseOf.get(r.id);
                return (
                  <li key={r.id} className="line">
                    <div>
                      <b className="mono">{fmt(r.amount)} tCO₂e · {lotLabel(r.parcel, r.period)}</b>
                      <span>{r.beneficiary}</span>
                      <span className="muted small">
                        {new Date(Number(r.ledger_time) * 1000).toLocaleDateString("es-AR")}
                        {buy ? ` · compra en el mercado, pagaste ${fromUnits(buy.paid)} ${PAYMENT_ASSET_CODE}` : ""}
                      </span>
                    </div>
                    <a className="copy" href={hrefFor("certificado", String(r.id))}>Certificado</a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      <LotModal key={action ? `${action.mode}:${action.lot.parcel}:${action.lot.period}` : "none"} action={action} onClose={() => setAction(null)} />
    </div>
  );
}
