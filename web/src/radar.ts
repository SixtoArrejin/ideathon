import { useEffect, useState } from "react";
import { PARCEL_IDS } from "./config";

export type NewsItem = { title: string; source: string; url: string; date: string };
export type News = { fetched_at: string; items: NewsItem[] };

export function useNews() {
  const [news, setNews] = useState<News | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/news.json").then((r) => r.json()).then(setNews).catch(() => setFailed(true));
  }, []);
  return { news, failed };
}

export type Scene = { id: string; date: string; cloud: number };
const STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search";

/** Última escena Sentinel-2 disponible (poca nubosidad) sobre el polígono de cada predio, consultada en vivo. */
export function useLatestScenes(bboxes: Record<string, string>) {
  const [scenes, setScenes] = useState<Record<string, Scene | null>>({});
  const [done, setDone] = useState(false);
  const key = PARCEL_IDS.map((id) => bboxes[id] ?? "").join("|");

  useEffect(() => {
    if (!PARCEL_IDS.every((id) => bboxes[id])) return;
    let live = true;
    Promise.all(PARCEL_IDS.map(async (id) => {
      try {
        const res = await fetch(STAC_SEARCH, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            collections: ["sentinel-2-l2a"],
            bbox: bboxes[id].split(",").map(Number),
            limit: 1,
            sortby: [{ field: "datetime", direction: "desc" }],
            query: { "eo:cloud_cover": { lt: 40 } },
          }),
        });
        const f = (await res.json()).features?.[0];
        return [id, f ? { id: f.id as string, date: f.properties.datetime as string, cloud: f.properties["eo:cloud_cover"] as number } : null] as const;
      } catch { return [id, null] as const; }
    })).then((r) => { if (live) { setScenes(Object.fromEntries(r)); setDone(true); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { scenes, done };
}

export const daysAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
export const ago = (iso: string) => {
  const d = daysAgo(iso);
  return d === 0 ? "hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`;
};
export const dateEs = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
