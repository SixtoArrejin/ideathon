import { useEffect, useState } from "react";

type Mode = "light" | "dark";
const read = (): Mode => {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
};

/** Alterna claro/oscuro. La elección se recuerda si el navegador deja guardarla. */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("dosel-theme"); } catch { /* sin almacenamiento */ }
    if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
    setMode(read());
  }, []);

  function toggle() {
    const next: Mode = read() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("dosel-theme", next); } catch { /* sin almacenamiento */ }
    setMode(next);
  }

  return (
    <button className="icon-btn" onClick={toggle} aria-label={mode === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {mode === "dark"
          ? <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>
          : <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />}
      </svg>
    </button>
  );
}
