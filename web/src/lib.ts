export const short = (a: string, n = 6) => `${a.slice(0, n)}…${a.slice(-n)}`;
export const fmt = (n: bigint | number) => Number(n).toLocaleString("es-AR");
export const ndvi = (milli: number) => (milli / 1000).toLocaleString("es-AR", { minimumFractionDigits: 3 });

/** "lon_min,lat_min,lon_max,lat_max" -> [[lat_min, lon_min], [lat_max, lon_max]] (formato Leaflet). */
export function parseBbox(b: string): [[number, number], [number, number]] {
  const [lo0, la0, lo1, la1] = b.split(",").map(Number);
  return [[la0, lo0], [la1, lo1]];
}

export const NDVI_MIN = 0.4;
export const NDVI_MAX_DROP = 0.15;

export const PARCEL_LABELS: Record<string, { name: string; zone: string }> = {
  IMPEN1: { name: "Impenetrable", zone: "Chaco · bosque seco" },
  CHACO1: { name: "Parque Nacional Chaco", zone: "Chaco · bosque húmedo" },
  TACOP1: { name: "Lote en desmonte", zone: "Taco Pozo / Copo · Chaco" },
};
