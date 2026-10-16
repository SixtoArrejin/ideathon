import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import Modal from "./components/Modal";
import { explainError, type ErrorContext } from "./errors";
import { EXPERT } from "./config";
import { connectFreighter, WalletError, type WalletIssue } from "./wallet";

export type TxOptions = {
  title: string;
  /** Una frase que dice qué va a pasar. */
  lead: string;
  rows: { label: string; value: ReactNode }[];
  /** Aviso corto debajo del resumen. */
  note?: string;
  confirmLabel: string;
  success: string;
  context?: ErrorContext;
  action: () => Promise<string>;
  onSuccess?: () => void;
};

type TxPhase = "confirm" | "signing" | "done" | "error";
type Dialog =
  | null
  | { kind: "wallet"; issue: WalletIssue; detail?: string; message?: string }
  | { kind: "tx"; phase: TxPhase; opts: TxOptions; hash?: string; error?: string };

type Ui = {
  wallet: string;
  connecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  transact: (opts: TxOptions) => void;
};

const Ctx = createContext<Ui | null>(null);
export const useUi = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUi fuera de UiProvider");
  return v;
};

const LAB_FUND = "https://lab.stellar.org/account/fund";

export function UiProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [connecting, setConnecting] = useState(false);
  const running = useRef(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const a = await connectFreighter();
      setWallet(a);
      setDialog(null);
      return a;
    } catch (e) {
      if (e instanceof WalletError) setDialog({ kind: "wallet", issue: e.issue, detail: e.detail, message: e.message });
      else setDialog({ kind: "wallet", issue: "other", message: e instanceof Error ? e.message : String(e) });
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setWallet(""), []);
  const close = useCallback(() => setDialog(null), []);

  const run = useCallback(async (opts: TxOptions) => {
    if (running.current) return;
    running.current = true;
    setDialog({ kind: "tx", phase: "signing", opts });
    try {
      const hash = await opts.action();
      setDialog({ kind: "tx", phase: "done", opts, hash });
      opts.onSuccess?.();
    } catch (e) {
      setDialog({ kind: "tx", phase: "error", opts, error: explainError(e, opts.context) });
    } finally {
      running.current = false;
    }
  }, []);

  const transact = useCallback((opts: TxOptions) => setDialog({ kind: "tx", phase: "confirm", opts }), []);
  const api = useMemo(() => ({ wallet, connecting, connect, disconnect, transact }), [wallet, connecting, connect, disconnect, transact]);
  // Solo en desarrollo: permite abrir los modales desde la consola para probarlos sin una billetera.
  if (import.meta.env.DEV) (window as unknown as { __ui?: Ui }).__ui = api;

  return (
    <Ctx.Provider value={api}>
      {children}
      <WalletDialog dialog={dialog} connecting={connecting} onRetry={connect} onClose={close} />
      <TxDialog dialog={dialog} onRun={run} onClose={close} />
    </Ctx.Provider>
  );
}

function WalletDialog({ dialog, connecting, onRetry, onClose }: {
  dialog: Dialog; connecting: boolean; onRetry: () => void; onClose: () => void;
}) {
  const d = dialog?.kind === "wallet" ? dialog : null;
  const copy = {
    missing: { tone: "info" as const, title: "Necesitás la billetera Freighter" },
    network: { tone: "warn" as const, title: "Cambiá Freighter a Testnet" },
    denied: { tone: "warn" as const, title: "Freighter no te dio acceso" },
    other: { tone: "crit" as const, title: "No pudimos conectar tu billetera" },
  }[d?.issue ?? "other"];

  return (
    <Modal open={!!d} tone={copy.tone} title={copy.title} onClose={onClose} actions={
      <>
        <button className="btn ghost" onClick={onClose}>Seguir explorando</button>
        <button className="btn" disabled={connecting} onClick={onRetry}>
          {connecting ? "Conectando…" : d?.issue === "missing" ? "Ya la instalé, reintentar" : "Reintentar"}
        </button>
      </>
    }>
      {d?.issue === "missing" && (
        <>
          <p>Freighter es la extensión que firma tus operaciones en Stellar. Dosel nunca ve ni guarda tus claves, y todo lo que se puede leer en esta página funciona sin billetera.</p>
          <ol className="steps">
            <li><b>Instalá la extensión</b> desde <a href="https://www.freighter.app" target="_blank" rel="noreferrer">freighter.app</a> y recargá esta página.</li>
            <li><b>Creá o importá una cuenta</b> y en Freighter elegí la red <b>Testnet</b>.</li>
            <li><b>Cargá XLM de prueba</b> con el <a href={LAB_FUND} target="_blank" rel="noreferrer">Friendbot de Stellar Lab</a>, si vas a comprar.</li>
          </ol>
          <p className="muted small">¿Ya la tenés? Desbloqueala, recargá la página y comprobá que esté habilitada en este navegador. Freighter funciona en Chrome, Brave, Edge y Firefox, pero no en Safari.</p>
        </>
      )}
      {d?.issue === "network" && (
        <>
          <p>Tu Freighter está en la red <b>{d.detail ?? "equivocada"}</b>. Dosel funciona sobre Testnet: los contratos y los XLM son de prueba y no tienen valor.</p>
          <p>Abrí Freighter, entrá al selector de red y elegí <b>Testnet</b>. Después tocá Reintentar.</p>
        </>
      )}
      {d?.issue === "denied" && (
        <p>Cancelaste el permiso. Dosel solo pide ver la dirección pública de tu cuenta y, cuando vos lo confirmás, pedirte una firma. Si fue sin querer, tocá Reintentar.</p>
      )}
      {d?.issue === "other" && (
        <>
          <p>Freighter respondió con un error. Revisá que la extensión esté desbloqueada y probá de nuevo.</p>
          {d.message && <p className="muted small">Detalle: {d.message}</p>}
        </>
      )}
    </Modal>
  );
}

function TxDialog({ dialog, onRun, onClose }: {
  dialog: Dialog; onRun: (o: TxOptions) => void; onClose: () => void;
}) {
  const d = dialog?.kind === "tx" ? dialog : null;
  const phase = d?.phase;
  const tone = phase === "done" ? "ok" : phase === "error" ? "crit" : "info";
  const title =
    phase === "signing" ? "Firmá en Freighter"
    : phase === "done" ? "Listo, quedó registrado"
    : phase === "error" ? "No se pudo completar"
    : d?.opts.title ?? "";

  let actions: ReactNode;
  if (phase === "confirm") {
    actions = (<>
      <button className="btn ghost" onClick={onClose}>Cancelar</button>
      <button className="btn" onClick={() => d && onRun(d.opts)}>{d?.opts.confirmLabel}</button>
    </>);
  } else if (phase === "done") {
    actions = (<>
      <a className="btn ghost" href={`${EXPERT}/tx/${d?.hash}`} target="_blank" rel="noreferrer">Ver en Stellar Expert ↗</a>
      <button className="btn" onClick={onClose}>Cerrar</button>
    </>);
  } else if (phase === "error") {
    actions = (<>
      <button className="btn ghost" onClick={onClose}>Cerrar</button>
      <button className="btn" onClick={() => d && onRun(d.opts)}>Reintentar</button>
    </>);
  }

  return (
    <Modal open={!!d} tone={tone} title={title} dismissible={phase !== "signing"} onClose={onClose} actions={actions}>
      {phase === "confirm" && d && (
        <>
          <p>{d.opts.lead}</p>
          <dl className="rows">
            {d.opts.rows.map((r) => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>)}
          </dl>
          {d.opts.note && <p className="muted small">{d.opts.note}</p>}
        </>
      )}
      {phase === "signing" && (
        <>
          <p className="working"><span className="spinner" aria-hidden="true" /> Abrí la ventana de Freighter y aprobá la transacción. Después esperamos la confirmación de la red.</p>
          <p className="muted small">No cierres esta pestaña. Si no ves la ventana, tocá el ícono de Freighter en la barra del navegador.</p>
        </>
      )}
      {phase === "done" && d && <p>{d.opts.success}</p>}
      {phase === "error" && d && <p>{d.error}</p>}
    </Modal>
  );
}
