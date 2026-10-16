import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getLot, getOffer, getParcel, getRetirement, lotsOf, offerCount, retirementCount, totalRetired, totalSupply,
  type LotBalance, type LotInfo, type Offer, type Parcel, type Retirement,
} from "./chain";
import { PARCEL_IDS } from "./config";
import { errText } from "./wallet";
import { useUi } from "./ui";
import type { Cover } from "./components/CoverCheck";

export type OpenOffer = Offer & { id: number };
export type Verification = {
  parcel: string; period: number; ndvi: number; scene: string; scene_date: string;
  minted: string | number; tx: string;
};

type Data = {
  supply: bigint | null;
  retired: bigint | null;
  parcels: Record<string, Parcel>;
  ver: Verification[];
  cover: Cover;
  rets: Retirement[];
  offers: OpenOffer[];
  myOffers: OpenOffer[];
  lotInfo: Record<string, LotInfo | null>;
  lots: LotBalance[];
  frozen: number;
  err: string;
  refresh: () => void;
};

const Ctx = createContext<Data | null>(null);
export const useData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData fuera de DataProvider");
  return v;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { wallet } = useUi();
  const [supply, setSupply] = useState<bigint | null>(null);
  const [retired, setRetired] = useState<bigint | null>(null);
  const [parcels, setParcels] = useState<Record<string, Parcel>>({});
  const [ver, setVer] = useState<Verification[]>([]);
  const [cover, setCover] = useState<Cover>({});
  const [rets, setRets] = useState<Retirement[]>([]);
  const [offers, setOffers] = useState<OpenOffer[]>([]);
  const [lotInfo, setLotInfo] = useState<Record<string, LotInfo | null>>({});
  const [lots, setLots] = useState<LotBalance[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, r, n, oc] = await Promise.all([totalSupply(), totalRetired(), retirementCount(), offerCount()]);
      setSupply(s); setRetired(r);
      const ps = await Promise.all(PARCEL_IDS.map(async (id) => [id, await getParcel(id)] as const));
      setParcels(Object.fromEntries(ps));
      const list = await Promise.all(Array.from({ length: Number(n) }, (_, i) => getRetirement(i)));
      setRets(list.filter((x): x is Retirement => !!x).reverse());
      const os = await Promise.all(Array.from({ length: Number(oc) }, async (_, id) => {
        const o = await getOffer(id);
        return o ? { ...o, id } : null;
      }));
      const open = os.filter((o): o is OpenOffer => !!o && o.open);
      setOffers(open);
      const keys = [...new Set(open.map((o) => `${o.parcel}:${o.period}`))];
      const infos = await Promise.all(keys.map(async (k) => {
        const [parcel, p] = k.split(":");
        return [k, await getLot(parcel, Number(p))] as const;
      }));
      setLotInfo(Object.fromEntries(infos));
      setErr("");
    } catch (e) { setErr(errText(e)); }
  }, []);

  const loadWallet = useCallback(async () => {
    if (!wallet) { setLots([]); return; }
    try { setLots(await lotsOf(wallet)); } catch { setLots([]); }
  }, [wallet]);

  const refresh = useCallback(() => { load(); loadWallet(); }, [load, loadWallet]);

  useEffect(() => {
    load();
    fetch("/verifications.json").then((r) => r.json()).then(setVer).catch(() => {});
    fetch("/crosscheck.json").then((r) => r.json()).then(setCover).catch(() => {});
  }, [load]);
  useEffect(() => { loadWallet(); }, [loadWallet]);

  const frozen = useMemo(() => Object.values(parcels).filter((p) => p.frozen).length, [parcels]);
  const myOffers = useMemo(() => offers.filter((o) => o.seller === wallet), [offers, wallet]);

  const value = useMemo(
    () => ({ supply, retired, parcels, ver, cover, rets, offers, myOffers, lotInfo, lots, frozen, err, refresh }),
    [supply, retired, parcels, ver, cover, rets, offers, myOffers, lotInfo, lots, frozen, err, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
