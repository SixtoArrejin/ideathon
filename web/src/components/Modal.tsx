import { useEffect, useRef, type ReactNode } from "react";

export type Tone = "info" | "ok" | "crit" | "warn";

const ICONS: Record<Tone, ReactNode> = {
  info: <path d="M12 8v.01M11 12h1v5h1" />,
  ok: <path d="M7 12.5l3.2 3.2L17 9" />,
  crit: <path d="M8 8l8 8M16 8l-8 8" />,
  warn: <path d="M12 7v6M12 16.5v.01" />,
};

type Props = {
  open: boolean;
  title: string;
  tone?: Tone;
  /** Si es false no se cierra con Esc ni haciendo clic afuera (por ejemplo mientras se firma). */
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
};

export default function Modal({ open, title, tone = "info", dismissible = true, onClose, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal tone-${tone}`}
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); if (dismissible) onClose(); }}
      onMouseDown={(e) => { if (dismissible && e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className="modal-box">
          <header>
            <svg className="modal-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[tone]}</g>
            </svg>
            <h2 id="modal-title">{title}</h2>
          </header>
          <div className="modal-body">{children}</div>
          {actions && <footer>{actions}</footer>}
        </div>
      )}
    </dialog>
  );
}
