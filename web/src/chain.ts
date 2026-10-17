import {
  Account, Contract, TransactionBuilder, BASE_FEE, rpc, scValToNative, nativeToScVal, Address, xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { CONTRACT_ID, MARKET_ID, PASSPHRASE, READ_ACCOUNT, RPC_URL } from "./config";

const server = new rpc.Server(RPC_URL);
const greenton = () => new Contract(CONTRACT_ID);
const market = () => new Contract(MARKET_ID);

export type Parcel = {
  owner: string; hectares: number; bbox: string; baseline_ndvi_milli: number;
  last_ndvi_milli: number; frozen: boolean; issued_tco2e: bigint;
};
export type Retirement = {
  holder: string; parcel: string; period: number; amount: bigint; beneficiary: string; ledger_time: bigint;
};
export type LotBalance = { parcel: string; period: number; amount: bigint };
export type LotInfo = { minted: bigint; ndvi_milli: number; ledger_time: bigint };
export type Offer = {
  seller: string; parcel: string; period: number; available: bigint; price_per_ton: bigint; open: boolean;
};
/** `fee` existe solo en mercados desplegados con comisión de plataforma. */
export type Purchase = { buyer: string; offer_id: number; amount: bigint; paid: bigint; fee?: bigint; retirement_id: number };

const sym = (s: string) => nativeToScVal(s, { type: "symbol" });
const u32 = (n: number) => nativeToScVal(n, { type: "u32" });
const i128 = (n: bigint) => nativeToScVal(n, { type: "i128" });
const str = (s: string) => nativeToScVal(s, { type: "string" });
const addr = (a: string) => new Address(a).toScVal();

async function read<T>(c: Contract, method: string, ...args: xdr.ScVal[]): Promise<T> {
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(c.call(method, ...args)).setTimeout(30).build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative((sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval) as T;
}

/** Prepara, firma con Freighter, envía y espera la confirmación. Devuelve el hash. */
async function submit(source: string, c: Contract, method: string, ...args: xdr.ScVal[]): Promise<string> {
  const acct = await server.getAccount(source);
  const built = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(c.call(method, ...args))
    .setTimeout(60).build();
  const prepared = await server.prepareTransaction(built);
  const signed = await signTransaction(prepared.toXDR(), { networkPassphrase: PASSPHRASE, address: source });
  if (signed.error) throw new Error(String(signed.error.message ?? signed.error));
  const tx = TransactionBuilder.fromXDR(signed.signedTxXdr, PASSPHRASE);
  const sent = await server.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error("La transacción fue rechazada");
  for (let i = 0; i < 30; i++) {
    const r = await server.getTransaction(sent.hash);
    if (r.status === "SUCCESS") return sent.hash;
    if (r.status === "FAILED") throw new Error("La transacción falló en la red");
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("Timeout esperando confirmación");
}

// ---- GreenTon ----
export const totalSupply = () => read<bigint>(greenton(), "total_supply");
export const totalRetired = () => read<bigint>(greenton(), "total_retired");
export const balanceOf = (a: string) => read<bigint>(greenton(), "balance", addr(a));
export const lotsOf = (a: string) => read<LotBalance[]>(greenton(), "lots_of", addr(a));
export const getLot = (parcel: string, period: number) => read<LotInfo | null>(greenton(), "get_lot", sym(parcel), u32(period));
export const getParcel = (id: string) => read<Parcel>(greenton(), "get_parcel", sym(id));
export const retirementCount = () => read<number>(greenton(), "retirement_count");
export const getRetirement = (id: number) => read<Retirement | null>(greenton(), "get_retirement", u32(id));

/** Retira (quema) toneladas de un lote propio. */
export const retire = (holder: string, parcel: string, period: number, amount: bigint, beneficiary: string) =>
  submit(holder, greenton(), "retire", addr(holder), sym(parcel), u32(period), i128(amount), str(beneficiary));

// ---- Mercado ----
export const offerCount = () => read<number>(market(), "offer_count");
export const getOffer = (id: number) => read<Offer | null>(market(), "get_offer", u32(id));
export const purchaseCount = () => read<number>(market(), "purchase_count");
export const getPurchase = (id: number) => read<Purchase | null>(market(), "get_purchase", u32(id));
export type PurchaseRow = Purchase & { id: number };

/** Comisión de la plataforma en puntos básicos. Los mercados desplegados sin comisión no tienen la función: se toma como 0. */
export const feeBps = () => read<number>(market(), "fee_bps").then(Number).catch(() => 0);

/**
 * Hash de la transacción que quemó un retiro. Busca el evento en el RPC, que conserva unos 7 días y escanea
 * pocos bloques por consulta: se estima en qué bloque ocurrió a partir de su fecha y se pagina desde ahí.
 * Si ya expiró, usa retirements.json, que guarda los hashes de los retiros oficiales.
 */
export async function retirementTx(id: number, r: Retirement): Promise<string | null> {
  try {
    const latest = (await server.getLatestLedger()).sequence;
    const ledgersAgo = Math.max(0, Date.now() / 1000 - Number(r.ledger_time)) / 5; // ~5 s por bloque en Testnet
    const margin = Math.max(3000, ledgersAgo * 0.15);
    const startLedger = Math.max(1, Math.floor(latest - ledgersAgo - margin));
    const endLedger = Math.ceil(latest - ledgersAgo + margin);
    const filters = [{ type: "contract" as const, contractIds: [CONTRACT_ID], topics: [[xdr.ScVal.scvSymbol("retired").toXDR("base64"), "*"]] }];
    let cursor: string | undefined;
    for (let page = 0; page < 12; page++) {
      const res = await server.getEvents(cursor ? { filters, cursor, limit: 200 } : { filters, startLedger, limit: 200 });
      const hit = res.events.find((e) => {
        const v = scValToNative(e.value) as { amount: bigint; beneficiary: string; parcel: string; period: number };
        return v.parcel === r.parcel && Number(v.period) === r.period && BigInt(v.amount) === r.amount
          && v.beneficiary === r.beneficiary && scValToNative(e.topic[1]) === r.holder;
      });
      if (hit) return hit.txHash;
      if (!res.cursor || res.cursor === cursor || res.events.some((e) => e.ledger > endLedger)) break;
      cursor = res.cursor;
    }
  } catch { /* sin RPC o fuera de la ventana de retención */ }
  try {
    const m = await (await fetch("/retirements.json")).json();
    return m[`${CONTRACT_ID}:${id}`] ?? null;
  } catch { return null; }
}

/** Publica una oferta: el lote pasa a custodia del mercado. */
export const list = (seller: string, parcel: string, period: number, amount: bigint, pricePerTon: bigint) =>
  submit(seller, market(), "list", addr(seller), sym(parcel), u32(period), i128(amount), i128(pricePerTon));

/** Paga al vendedor y quema las toneladas a nombre del beneficiario, en una sola transacción. */
export const buyAndRetire = (buyer: string, offerId: number, amount: bigint, beneficiary: string) =>
  submit(buyer, market(), "buy_and_retire", addr(buyer), u32(offerId), i128(amount), str(beneficiary));

export const cancel = (seller: string, offerId: number) =>
  submit(seller, market(), "cancel", addr(seller), u32(offerId));
