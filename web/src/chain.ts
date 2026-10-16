import {
  Account, Contract, TransactionBuilder, BASE_FEE, rpc, scValToNative, nativeToScVal, Address,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { CONTRACT_ID, PASSPHRASE, READ_ACCOUNT, RPC_URL } from "./config";

const server = new rpc.Server(RPC_URL);
const contract = new Contract(CONTRACT_ID);

export type Parcel = {
  owner: string; hectares: number; bbox: string; baseline_ndvi_milli: number;
  last_ndvi_milli: number; frozen: boolean; issued_tco2e: bigint;
};
export type Retirement = { holder: string; amount: bigint; beneficiary: string; ledger_time: bigint };

async function read<T>(method: string, ...args: import("@stellar/stellar-sdk").xdr.ScVal[]): Promise<T> {
  const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(contract.call(method, ...args)).setTimeout(30).build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative((sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval) as T;
}

export const totalSupply = () => read<bigint>("total_supply");
export const totalRetired = () => read<bigint>("total_retired");
export const balanceOf = (a: string) => read<bigint>("balance", new Address(a).toScVal());
export const getParcel = (id: string) => read<Parcel>("get_parcel", nativeToScVal(id, { type: "symbol" }));
export const retirementCount = () => read<number>("retirement_count");
export const getRetirement = (id: number) => read<Retirement | null>("get_retirement", nativeToScVal(id, { type: "u32" }));

/** Retira (quema) créditos firmando con Freighter. Devuelve el hash de la transacción. */
export async function retire(holder: string, amount: bigint, beneficiary: string): Promise<string> {
  const acct = await server.getAccount(holder);
  const built = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(contract.call("retire",
      new Address(holder).toScVal(), nativeToScVal(amount, { type: "i128" }), nativeToScVal(beneficiary, { type: "string" })))
    .setTimeout(60).build();
  const prepared = await server.prepareTransaction(built);
  const signed = await signTransaction(prepared.toXDR(), { networkPassphrase: PASSPHRASE, address: holder });
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
