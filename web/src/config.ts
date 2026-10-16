const env = import.meta.env;

// IDs de GreenTon v2 y del mercado: se fijan al desplegar (ver DEPLOY.md).
export const CONTRACT_ID: string = env.VITE_GREENTON_ID ?? "";
export const MARKET_ID: string = env.VITE_MARKET_ID ?? "";
// SAC de XLM nativo en Testnet: `stellar contract id asset --asset native --network testnet`.
export const PAYMENT_ASSET_ID: string =
  env.VITE_PAYMENT_ASSET_ID ?? "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const PAYMENT_ASSET_CODE = "XLM";
/** XLM y USDC en Stellar usan 7 decimales. */
export const PAYMENT_DECIMALS = 7;
export const CONFIGURED = CONTRACT_ID !== "" && MARKET_ID !== "";

export const RPC_URL = "https://soroban-testnet.stellar.org";
export const PASSPHRASE = "Test SDF Network ; September 2015";
// Cuenta pública del oráculo, usada solo como fuente de simulación de lecturas.
export const READ_ACCOUNT = "GAD6MXY72PSLIMCSY2U5SCMVEXLWKW6DXP6U3BGFWYMVFIEMVQNMI2QL";
export const PARCEL_IDS = ["IMPEN1", "CHACO1", "TACOP1"];
export const EXPERT = "https://stellar.expert/explorer/testnet";
