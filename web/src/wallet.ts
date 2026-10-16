import { getNetworkDetails, isConnected, requestAccess } from "@stellar/freighter-api";
import { PASSPHRASE } from "./config";

export type WalletIssue = "missing" | "denied" | "network" | "other";

export class WalletError extends Error {
  constructor(public issue: WalletIssue, message: string, public detail?: string) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** La extensión se inyecta unos instantes después de cargar la página: se espera antes de darla por ausente. */
async function detected(): Promise<boolean> {
  const attempt = () => Promise.race([isConnected().then((r) => r.isConnected), sleep(700).then(() => false)]);
  for (let i = 0; i < 4; i++) {
    try { if (await attempt()) return true; } catch { /* sin extensión */ }
    await sleep(200);
  }
  return false;
}

export async function connectFreighter(): Promise<string> {
  if (!(await detected())) throw new WalletError("missing", "No se detectó Freighter en este navegador.");
  const r = await requestAccess();
  if (r.error) {
    const msg = String(r.error.message ?? r.error);
    throw new WalletError(/declin|reject|denied|cancel|closed/i.test(msg) ? "denied" : "other", msg);
  }
  const net = await getNetworkDetails().catch(() => null);
  if (net && !net.error && net.networkPassphrase && net.networkPassphrase !== PASSPHRASE) {
    throw new WalletError("network", "Freighter está en otra red.", net.network);
  }
  return r.address;
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
