import { useEffect, useState } from "react";
import { PARCEL_IDS } from "./config";

export type Page = "inicio" | "predios" | "mercado" | "radar" | "cuenta" | "transparencia" | "certificado";
export const PAGES: { id: Page; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "predios", label: "Predios" },
  { id: "mercado", label: "Mercado" },
  { id: "radar", label: "Radar" },
  { id: "cuenta", label: "Mi cuenta" },
  { id: "transparencia", label: "Transparencia" },
  { id: "certificado", label: "Certificado" },
];

/** Enlaces de la barra: Mi cuenta vive en el menú de la billetera y el certificado se abre desde un retiro. */
export const NAV_PAGES = PAGES.filter((p) => p.id !== "cuenta" && p.id !== "certificado");

export type Route = { page: Page; param?: string };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  if (PARCEL_IDS.includes(raw)) return { page: "predios", param: raw }; // enlaces viejos: #IMPEN1
  const [seg, param] = raw.split("/");
  if (PAGES.some((p) => p.id === seg)) return { page: seg as Page, param: param || undefined };
  return { page: "inicio" };
}

export const hrefFor = (page: Page, param?: string) => (page === "inicio" ? "#/" : `#/${page}${param ? `/${param}` : ""}`);

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
