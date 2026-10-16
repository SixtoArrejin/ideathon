import { useEffect, useRef, useState } from "react";
import { EXPERT } from "../config";
import { short } from "../lib";
import { hrefFor, PAGES, type Page } from "../router";
import { useUi } from "../ui";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

function WalletChip() {
  const { wallet, connecting, connect, disconnect } = useUi();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (!wallet) {
    return (
      <button className="btn small" disabled={connecting} onClick={() => connect()}>
        {connecting ? "Buscando…" : "Conectar billetera"}
      </button>
    );
  }
  return (
    <div className="wallet" ref={box}>
      <button className="chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="dot" aria-hidden="true" />
        <span className="mono">{short(wallet, 4)}</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(wallet).catch(() => {}); setOpen(false); }}>Copiar dirección</button>
          <a role="menuitem" href={`${EXPERT}/account/${wallet}`} target="_blank" rel="noreferrer">Ver en Stellar Expert ↗</a>
          <a role="menuitem" href={hrefFor("cuenta")} onClick={() => setOpen(false)}>Mi cuenta</a>
          <button role="menuitem" onClick={() => { disconnect(); setOpen(false); }}>Desconectar</button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ page }: { page: Page }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [page]);

  return (
    <header className={`nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="wrap nav-bar">
        <a className="brand" href={hrefFor("inicio")} aria-label="Dosel, inicio">
          <Logo size={28} />
          <span>Dosel</span>
        </a>
        <nav className="links" aria-label="Secciones">
          {PAGES.map((p) => (
            <a key={p.id} href={hrefFor(p.id)} className={p.id === page ? "is-active" : ""} aria-current={p.id === page ? "page" : undefined}>{p.label}</a>
          ))}
        </nav>
        <div className="nav-end">
          <span className="pill">Testnet</span>
          <ThemeToggle />
          <WalletChip />
          <button className="icon-btn burger" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav className="drawer" aria-label="Secciones (móvil)">
        <div className="wrap">
          {PAGES.map((p) => (
            <a key={p.id} href={hrefFor(p.id)} className={p.id === page ? "is-active" : ""}>{p.label}</a>
          ))}
        </div>
      </nav>
    </header>
  );
}
