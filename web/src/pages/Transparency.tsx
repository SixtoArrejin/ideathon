import CopyButton from "../components/CopyButton";
import { ACCOUNTS, CONTRACT_ID, EXPERT, MARKET_ID, PAYMENT_ASSET_ID, V1_CONTRACT_ID } from "../config";
import { useData } from "../data";
import { fmt, lotLabel, short } from "../lib";
import { hrefFor } from "../router";

const SECTIONS = [
  { id: "porque", label: "Por qué existe Dosel" },
  { id: "retiros", label: "Registro de retiros" },
  { id: "reglas", label: "Reglas del contrato" },
  { id: "contratos", label: "Contratos y cuentas" },
  { id: "limites", label: "Límites" },
  { id: "hecho", label: "Datos y herramientas" },
];

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Transparency() {
  const { rets, loaded } = useData();
  const contracts = [
    { name: "GreenTon", note: "Lotes, emisión, congelamiento y retiro", id: CONTRACT_ID },
    { name: "Mercado", note: "Ofertas y compra con quema atómica", id: MARKET_ID },
    { name: "Activo de pago (XLM)", note: "Contrato estándar del activo nativo de Stellar", id: PAYMENT_ASSET_ID },
    { name: "GreenTon (primera entrega)", note: "Archivo: sin lotes ni mercado", id: V1_CONTRACT_ID },
  ];

  return (
    <div className="wrap page-pad">
      <header className="page-head">
        <p className="kicker">Transparencia</p>
        <h1>Todo lo que se puede verificar, y lo que no</h1>
        <p className="lead">Dosel es un prototipo. Acá está el registro público, las reglas que el contrato aplica solo y los límites que todavía tiene.</p>
      </header>

      <div className="doc">
        <nav className="toc" aria-label="En esta página">
          {SECTIONS.map((s) => <button key={s.id} onClick={() => go(s.id)}>{s.label}</button>)}
        </nav>

        <div className="doc-body">
          <section id="porque">
            <h2>Por qué existe Dosel</h2>
            <p className="lead">Un crédito de carbono vale lo que vale la prueba que tiene detrás. Hoy esa prueba suele ser un PDF firmado, mientras el bosque que se dice proteger puede estar cayendo.</p>
            <ul className="stats3">
              <li><b>119.886 ha</b><span>de bosque nativo desmontadas en el norte argentino en 2024, según Greenpeace.</span></li>
              <li><b>210.702 ha</b><span>perdidas en 2025 entre desmonte e incendios, según el mismo informe.</span></li>
              <li><b>Sin marco legal</b><span>El mercado de carbono argentino sigue esperando una ley: el Senado dio dictamen en septiembre de 2026.</span></li>
            </ul>
            <h3>Por qué en una blockchain</h3>
            <p className="muted">No es tecnología por la tecnología: es el lugar donde la confianza no se puede delegar.</p>
            <ul className="why3">
              <li><h3>Una tonelada, un solo dueño</h3><p>En la base de datos de un operador, la misma tonelada se puede vender dos veces o editar después. En un contrato compartido el saldo es uno solo y lo ve cualquiera.</p></li>
              <li><h3>Pagar y compensar, juntos</h3><p>El mercado cobra, le paga al dueño y quema las toneladas en una sola transacción. Nadie tiene que confiar en la otra parte ni en un intermediario.</p></li>
              <li><h3>Reglas y pruebas que nadie reescribe</h3><p>El umbral que congela un predio y cada verificación quedan grabados con su escena satelital. Ni el propietario ni nosotros podemos cambiarlos después.</p></li>
            </ul>
            <p className="note"><b>Lo que no va a la cadena:</b> las imágenes, el cálculo del NDVI y los mapas. Solo vive en la red lo que necesita confianza compartida.</p>
          </section>

          <section id="retiros">
            <h2>Registro de retiros</h2>
            <p className="muted">Cada fila es una quema irreversible. En las compras del mercado, el titular que figura es el contrato del mercado y el comprador queda en el evento de compra.</p>
            <ul className="ledger">
              {!loaded && <li className="muted">Leyendo la red de Stellar…</li>}
              {loaded && rets.length === 0 && <li className="muted">Todavía no hay retiros.</li>}
              {rets.map((r, i) => (
                <li key={i}>
                  <b className="mono">{fmt(r.amount)} tCO₂e</b>
                  <span>{r.beneficiary}</span>
                  <span className="muted mono">
                    <a href={hrefFor("predios", r.parcel)}>{lotLabel(r.parcel, r.period)}</a>
                    {" · "}{r.holder === MARKET_ID ? "vía mercado" : short(r.holder, 4)}
                    {" · "}{new Date(Number(r.ledger_time) * 1000).toLocaleDateString("es-AR")}
                    {" · "}<a href={hrefFor("certificado", String(r.id))}>Certificado</a>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="reglas">
            <h2>Reglas del contrato</h2>
            <ol className="rules-list">
              <li><b>Solo emite el oráculo.</b> El auditor registra el predio a nombre de su dueño, después de revisar título y polígono. Ni el dueño ni nadie más puede acuñar.</li>
              <li><b>Un período, un lote.</b> Cada verificación crea un lote propio del predio y del período, y no se puede repetir.</li>
              <li><b>La vegetación tiene que sostenerse.</b> Si el NDVI baja de 0,40 o cae más de 0,15 desde la línea base, el predio se congela y no emite. Solo el auditor lo levanta.</li>
              <li><b>Comprar es compensar.</b> El mercado cobra, paga al vendedor (y la comisión de la plataforma, si la hay) y quema las toneladas del lote en la misma transacción.</li>
              <li><b>Retirar es irreversible.</b> Quemar descuenta del suministro y guarda quién compensó y de qué lote.</li>
            </ol>
          </section>

          <section id="contratos">
            <h2>Contratos y cuentas</h2>
            <p className="muted">Red: Stellar Testnet. Todo se puede revisar en Stellar Expert.</p>
            <ul className="ids">
              {contracts.map((c) => (
                <li key={c.id}>
                  <div><b>{c.name}</b><span className="muted small">{c.note}</span></div>
                  <code className="mono">{c.id}</code>
                  <span className="row"><CopyButton text={c.id} /><a className="copy" href={`${EXPERT}/contract/${c.id}`} target="_blank" rel="noreferrer">Expert ↗</a></span>
                </li>
              ))}
              {ACCOUNTS.map((a) => (
                <li key={a.address}>
                  <div><b>{a.role}</b><span className="muted small">Cuenta</span></div>
                  <code className="mono">{a.address}</code>
                  <span className="row"><CopyButton text={a.address} /><a className="copy" href={`${EXPERT}/account/${a.address}`} target="_blank" rel="noreferrer">Expert ↗</a></span>
                </li>
              ))}
            </ul>
          </section>

          <section id="limites">
            <h2>Límites que declaramos</h2>
            <ul className="limits">
              <li><b>El oráculo es una sola clave.</b> Quien la tiene decide el NDVI y las toneladas que entran al contrato. El paso siguiente son varias fuentes y auditores certificados.</li>
              <li><b>El factor de toneladas es ilustrativo.</b> 5,5 tCO₂e por hectárea y año a vigor máximo, escalado por NDVI. No es una metodología certificada.</li>
              <li><b>El NDVI solo no basta.</b> Puede confundir un cultivo estacional con una tala y dejar pasar una conversión de monte a cultivo. Por eso se cruza con una cobertura del suelo, pero esa segunda señal todavía no está dentro del contrato.</li>
              <li><b>Congelar no bloquea lotes viejos.</b> Las toneladas emitidas antes de una caída se pueden seguir vendiendo, y la web lo advierte.</li>
              <li><b>Sin entrevistas a usuarios.</b> La validación es documental y técnica.</li>
              <li><b>GreenTon no sigue el estándar de token SEP-41.</b> Las billeteras genéricas no muestran saldos por lote.</li>
              <li><b>Solo Testnet.</b> Nada de esto tiene valor de mercado.</li>
            </ul>
          </section>

          <section id="hecho">
            <h2>Datos y herramientas</h2>
            <ul className="limits">
              <li><b>Stellar:</b> contratos Soroban en Rust, Stellar SDK, Soroban RPC y Freighter.</li>
              <li><b>Imágenes:</b> Sentinel-2 L2A (Copernicus/ESA), servidas por Microsoft Planetary Computer.</li>
              <li><b>Cobertura del suelo:</b> Impact Observatory, 10 m anual, vía Planetary Computer.</li>
              <li><b>Mapa:</b> teselas de Esri World Imagery.</li>
              <li><b>Cómo se construyó:</b> el código se escribió durante la hackathon con ayuda de Claude Code (Anthropic), declarado en el README.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
