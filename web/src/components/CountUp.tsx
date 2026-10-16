import { useEffect, useRef, useState } from "react";
import { fmt } from "../lib";

/** Cuenta hasta el valor al aparecer. Con movimiento reducido, muestra el valor directo. */
export default function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const start = performance.now(), a = from.current, dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{fmt(shown)}</>;
}
