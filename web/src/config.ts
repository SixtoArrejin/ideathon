const env = import.meta.env;

// IDs de GreenTon v2 y del mercado en Testnet (ver DEPLOY.md). Se pueden pisar con VITE_GREENTON_ID / VITE_MARKET_ID.
export const CONTRACT_ID: string = env.VITE_GREENTON_ID ?? "CD4WZAWPGFZL2GUOOWYNSPG3CGNO6PA6QJ2UP5PCCOTBQK3KGJS25K7Q";
export const MARKET_ID: string = env.VITE_MARKET_ID ?? "CCVSHRV373O3QPIJL55LYQK6OGLLYIPMMD35KDQDY7AXHB7VLVOJTYDD";
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

/** Cuentas públicas de la demo en Testnet. */
export const ACCOUNTS = [
  { role: "Administrador (auditor)", address: "GBUV6IJFW22PVJYBU2PNYNE3OLGC6BMYCTGTYYHD6LGZ4WUBXGTVB2ZY" },
  { role: "Oráculo", address: "GAD6MXY72PSLIMCSY2U5SCMVEXLWKW6DXP6U3BGFWYMVFIEMVQNMI2QL" },
  { role: "Propietario de los predios", address: "GC3OLPSBNRCMPEQUIPWIFCU2K5BOTDZD7EZUSI3AXSAVJ5YQM5K7WAQD" },
];
/** Contrato de la primera entrega (sin lotes ni mercado), conservado como archivo. */
export const V1_CONTRACT_ID = "CCNQ7X37TFBQQVSIX7H7JMINVIBOR7FZBEAA474FFTVIONJGXSXMFEMG";

/** Repositorio donde llegan las propuestas de predios (cada una abre un issue prellenado). */
export const REPO_URL = "https://github.com/SixtoArrejin/ideathon";
