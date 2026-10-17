import qrcode from "qrcode-generator";
import { useEffect, useState } from "react";
import { getLot, getParcel, getPurchase, getRetirement, purchaseCount, type LotInfo, type Parcel, type Purchase, type Retirement } from "../chain";
import CopyButton from "../components/CopyButton";
import { CONTRACT_ID, EXPERT, MARKET_ID, PAYMENT_ASSET_CODE } from "../config";
import { useData } from "../data";
import { fmt, fromUnits, lotLabel, ndvi, PARCEL_LABELS, short } from "../lib";
import { hrefFor } from "../router";

type Cert = { ret: Retirement; lot: LotInfo | null; parcel: Parcel | null; purchase: Purchase | null };
type State = { status: "loading" } | { status: "missing" } | { status: "error"; msg: string } | { status: "ok"; cert: Cert };

/** QR como SVG vectorial (se imprime nítido y no depende de un servicio externo). */
function Qr({ text }: { text: string }) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  return (
    <svg className="qr" viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label="Código QR al contrato GreenTon en Stellar Expert" shapeRendering="crispEdges">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <g fill="#000">{cells}</g>
    </svg>
  );
}

/** La compra del mercado que originó este retiro, si la hubo (para mostrar comprador y pago). */
async function findPurchase(retirementId: number): Promise<Purchase | null> {
  const n = await purchaseCount();
  for (let i = Number(n) - 1; i >= 0; i--) {
    const p = await getPurchase(i);
    if (p && p.retirement_id === retirementId) return p;
  }
  return null;
}

async function loadCert(id: number): Promise<State> {
  try {
    const ret = await getRetirement(id);
    if (!ret) return { status: "missing" };
    const [lot, parcel, purchase] = await Promise.all([
      getLot(ret.parcel, ret.period).catch(() => null),
      getParcel(ret.parcel).catch(() => null),
      ret.holder === MARKET_ID ? findPurchase(id).catch(() => null) : Promise.resolve(null),
    ]);
    return { status: "ok", cert: { ret, lot, parcel, purchase } };
  } catch (e) {
    return { status: "error", msg: e instanceof Error ? e.message : String(e) };
  }
}

export default function Certificate({ id }: { id?: string }) {
  const { ver } = useData();
  const num = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (num === null) return;
    let live = true;
    setState({ status: "loading" });
    loadCert(num).then((s) => { if (live) setState(s); });
    return () => { live = false; };
  }, [num]);

  const back = <a className="copy" href={hrefFor("transparencia")}>← Registro de retiros</a>;

  if (num === null || state.status === "missing") {
    return (
      <div className="wrap page-pad">
        <div className="empty">
          <h1>No encontramos ese certificado</h1>
          <p className="muted">{num === null ? "El enlace no tiene un número de retiro válido." : `El retiro n.º ${num} todavía no existe en el contrato.`}</p>
          {back}
        </div>
      </div>
    );
  }
  if (state.status === "loading") return <div className="wrap page-pad"><p className="muted" role="status">Leyendo la red de Stellar…</p></div>;
  if (state.status === "error") {
    return (
      <div className="wrap page-pad">
        <p className="msg crit" role="alert">No se pudo leer el retiro. {state.msg}</p>
        {back}
      </div>
    );
  }

  const { ret, lot, parcel, purchase } = state.cert;
  const meta = PARCEL_LABELS[ret.parcel];
  const evidence = ver.find((v) => v.parcel === ret.parcel && v.period === ret.period);
  const date = new Date(Number(ret.ledger_time) * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const contractUrl = `${EXPERT}/contract/${CONTRACT_ID}`;
  const holderLabel = ret.holder === MARKET_ID ? "Mercado Dosel (compra y retiro atómico)" : short(ret.holder, 6);

  return (
    <div className="wrap page-pad">
      <div className="cert-actions no-print">
        {back}
        <span className="row">
          <CopyButton text={window.location.href} label="Copiar enlace" />
          <button className="btn" onClick={() => window.print()}>Imprimir o guardar PDF</button>
        </span>
      </div>

      <article className="cert" aria-labelledby="cert-title">
        <header>
          <p className="kicker">Certificado de compensación · Retiro n.º {id}</p>
          <h1 id="cert-title">{fmt(ret.amount)} tCO₂e retiradas de circulación</h1>
          <p className="lead">A nombre de <b>{ret.beneficiary}</b>, el {date}.</p>
        </header>

        <dl className="cert-grid">
          <div><dt>Beneficiario</dt><dd>{ret.beneficiary}</dd></div>
          <div><dt>Toneladas retiradas</dt><dd className="mono">{fmt(ret.amount)} tCO₂e (= {fmt(ret.amount)} GTON quemados)</dd></div>
          <div><dt>Predio</dt><dd>{meta ? `${meta.name} · ${meta.zone}` : ret.parcel} <span className="mono muted">({ret.parcel})</span></dd></div>
          <div><dt>Lote</dt><dd className="mono">{lotLabel(ret.parcel, ret.period)}</dd></div>
          {parcel && <div><dt>Superficie</dt><dd className="mono">{fmt(parcel.hectares)} ha · bbox {parcel.bbox}</dd></div>}
          {lot && <div><dt>Verificación satelital</dt><dd className="mono">NDVI {ndvi(lot.ndvi_milli)} · {fmt(lot.minted)} tCO₂e emitidas en el lote</dd></div>}
          {evidence && <div><dt>Escena Sentinel-2 L2A</dt><dd className="mono">{evidence.scene} ({evidence.scene_date})</dd></div>}
          {evidence?.tx && <div><dt>Transacción de emisión</dt><dd className="mono"><a href={`${EXPERT}/tx/${evidence.tx}`} target="_blank" rel="noreferrer">{short(evidence.tx, 8)} ↗</a></dd></div>}
          {purchase && <div><dt>Comprador</dt><dd className="mono">{short(purchase.buyer, 6)}</dd></div>}
          {purchase && <div><dt>Pago</dt><dd className="mono">{fromUnits(purchase.paid)} {PAYMENT_ASSET_CODE}{purchase.fee !== undefined && purchase.fee > 0n ? ` (comisión de plataforma ${fromUnits(purchase.fee)} ${PAYMENT_ASSET_CODE})` : ""}</dd></div>}
          <div><dt>Titular al quemar</dt><dd className="mono">{holderLabel}</dd></div>
        </dl>

        <footer className="cert-verify">
          <Qr text={contractUrl} />
          <div>
            <h2>Cómo verificarlo sin confiar en Dosel</h2>
            <p className="small">El registro <span className="mono">Retirement #{id}</span> vive en el contrato GreenTon y nadie puede editarlo. Escaneá el código o abrí el contrato en Stellar Expert y buscá el evento de retiro con este mismo lote y cantidad.</p>
            <p className="small mono"><a href={contractUrl} target="_blank" rel="noreferrer">{short(CONTRACT_ID, 8)} ↗</a></p>
            <p className="small muted">Prototipo en Testnet: este certificado no tiene valor de mercado ni validez regulatoria.</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
