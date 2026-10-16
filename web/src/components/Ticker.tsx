import { useMemo } from "react";
import { useData } from "../data";
import { fmt, lotLabel, ndvi, short } from "../lib";
import { MARKET_ID } from "../config";

type Item = { key: string; tone: "ok" | "crit" | "burn"; label: string; text: string };

/** Cinta con la actividad reciente registrada en la red: verificaciones, congelamientos y retiros. */
export default function Ticker() {
  const { ver, rets } = useData();
  const items = useMemo<Item[]>(() => {
    const v: Item[] = ver.map((x) => ({
      key: x.tx,
      tone: Number(x.minted) > 0 ? "ok" : "crit",
      label: Number(x.minted) > 0 ? "Verificado" : "Congelado",
      text: `${lotLabel(x.parcel, x.period)} · NDVI ${ndvi(Math.round(x.ndvi * 1000))}${Number(x.minted) > 0 ? ` · +${fmt(Number(x.minted))} GTON` : " · sin emisión"}`,
    }));
    const r: Item[] = rets.map((x, n) => ({
      key: `r${n}`, tone: "burn", label: "Retirado",
      text: `${fmt(x.amount)} t · ${lotLabel(x.parcel, x.period)} · ${x.holder === MARKET_ID ? "vía mercado" : short(x.holder, 4)}`,
    }));
    return [...r, ...v];
  }, [ver, rets]);

  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="ticker" role="region" aria-label="Actividad reciente en la red">
      <div className="ticker-track">
        {loop.map((it, n) => (
          <span key={`${it.key}-${n}`} className={`tick ${it.tone}`} aria-hidden={n >= items.length}>
            <i /> <b>{it.label}</b> <span className="mono">{it.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
