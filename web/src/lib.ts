export const short = (a: string, n = 6) => `${a.slice(0, n)}…${a.slice(-n)}`;
export const fmt = (n: bigint | number) => Number(n).toLocaleString("es-AR");
export const ndvi = (milli: number) => (milli / 1000).toLocaleString("es-AR", { minimumFractionDigits: 3 });

/** "lon_min,lat_min,lon_max,lat_max" -> [[lat_min, lon_min], [lat_max, lon_max]] (formato Leaflet). */
export function parseBbox(b: string): [[number, number], [number, number]] {
  const [lo0, la0, lo1, la1] = b.split(",").map(Number);
  return [[la0, lo0], [la1, lo1]];
}

export const period = (p: number) => String(p).replace(/(\d{4})(\d{2})/, "$1-$2");
export const lotLabel = (parcel: string, p: number) => `${parcel} · ${period(p)}`;

/** "1,5" o "1.5" -> unidades mínimas del activo (7 decimales). Devuelve null si no es válido. */
export function toUnits(s: string, decimals = 7): bigint | null {
  const m = s.trim().replace(",", ".").match(/^(\d+)(?:\.(\d*))?$/);
  if (!m) return null;
  const frac = (m[2] ?? "").slice(0, decimals).padEnd(decimals, "0");
  return BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac || "0");
}

export function fromUnits(n: bigint, decimals = 7): string {
  const base = 10n ** BigInt(decimals);
  const frac = (n % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${(n / base).toLocaleString("es-AR")}${frac ? `,${frac}` : ""}`;
}

export const NDVI_MIN = 0.4;
export const NDVI_MAX_DROP = 0.15;

export const PARCEL_LABELS: Record<string, { name: string; zone: string }> = {
  IMPEN1: { name: "Impenetrable", zone: "Chaco · bosque seco" },
  CHACO1: { name: "Parque Nacional Chaco", zone: "Chaco · bosque húmedo" },
  TACOP1: { name: "Lote agrícola", zone: "Taco Pozo / Copo · Chaco" },
};
