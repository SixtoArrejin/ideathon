import { isConnected, requestAccess } from "@stellar/freighter-api";

export async function connectFreighter(): Promise<string> {
  if (!(await isConnected()).isConnected) throw new Error("No se encontró Freighter. Instalá la extensión y cambiá a la red Testnet.");
  const r = await requestAccess();
  if (r.error) throw new Error(String(r.error.message ?? r.error));
  return r.address;
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
