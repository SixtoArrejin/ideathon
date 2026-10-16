#![no_std]
//! GreenTon — créditos de carbono verificados por satélite (CarbonTrack NEA).
//!
//! 1 GreenTon = 1 tCO2e. Solo el oráculo puede emitir, una vez por predio y período.
//! Cada emisión crea un lote (predio, período): saldos, transferencias y retiros son por lote,
//! así que cualquier tonelada se puede rastrear hasta la verificación satelital que la originó.
//! Si el NDVI cae bajo el umbral absoluto o respecto de la línea base, el predio se congela.
//! Retirar (retire) quema los tokens de forma permanente y deja registro público del beneficiario.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, String,
    Symbol, Vec,
};

/// NDVI en milésimas (0.612 => 612).
pub const NDVI_MIN_MILLI: i32 = 400;
/// Caída máxima tolerada respecto de la línea base (milésimas).
pub const NDVI_MAX_DROP_MILLI: i32 = 150;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ParcelExists = 1,
    ParcelNotFound = 2,
    ParcelFrozen = 3,
    PeriodAlreadyIssued = 4,
    InvalidAmount = 5,
    InsufficientBalance = 6,
    NotFrozen = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Parcel {
    pub owner: Address,
    pub hectares: u32,
    /// Bounding box "lon_min,lat_min,lon_max,lat_max" (WGS84).
    pub bbox: String,
    pub baseline_ndvi_milli: i32,
    pub last_ndvi_milli: i32,
    pub frozen: bool,
    pub issued_tco2e: i128,
}

/// Lote: las toneladas emitidas para un predio en un período.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Lot {
    pub parcel: Symbol,
    pub period: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotInfo {
    pub minted: i128,
    pub ndvi_milli: i32,
    pub ledger_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LotBalance {
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Retirement {
    pub holder: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
    pub beneficiary: String,
    pub ledger_time: u64,
}

#[contracttype]
enum Key {
    Admin,
    Oracle,
    Supply,
    Retired,
    RetireCount,
    Balance(Address, Lot),
    /// Lotes con saldo positivo de una cuenta.
    Lots(Address),
    LotInfo(Lot),
    Parcel(Symbol),
    Issued(Symbol, u32),
    Retirement(u32),
}

#[contractevent]
pub struct ParcelRegistered {
    #[topic]
    pub parcel: Symbol,
    pub owner: Address,
}

#[contractevent]
pub struct Minted {
    #[topic]
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
    pub ndvi_milli: i32,
}

#[contractevent]
pub struct Frozen {
    #[topic]
    pub parcel: Symbol,
    pub period: u32,
    pub ndvi_milli: i32,
}

#[contractevent]
pub struct Transferred {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
}

#[contractevent]
pub struct Retired {
    #[topic]
    pub holder: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
    pub beneficiary: String,
}

#[contract]
pub struct GreenTon;

fn read_lots(e: &Env, a: &Address) -> Vec<Lot> {
    e.storage()
        .persistent()
        .get(&Key::Lots(a.clone()))
        .unwrap_or(Vec::new(e))
}

fn read_balance(e: &Env, a: &Address, lot: &Lot) -> i128 {
    e.storage()
        .persistent()
        .get(&Key::Balance(a.clone(), lot.clone()))
        .unwrap_or(0)
}

/// Escribe el saldo de un lote y mantiene el índice `Lots` de la cuenta.
fn write_balance(e: &Env, a: &Address, lot: &Lot, v: i128) {
    let key = Key::Balance(a.clone(), lot.clone());
    let mut lots = read_lots(e, a);
    let pos = lots.first_index_of(lot);
    if v == 0 {
        e.storage().persistent().remove(&key);
        if let Some(i) = pos {
            lots.remove(i);
            e.storage().persistent().set(&Key::Lots(a.clone()), &lots);
        }
    } else {
        e.storage().persistent().set(&key, &v);
        if pos.is_none() {
            lots.push_back(lot.clone());
            e.storage().persistent().set(&Key::Lots(a.clone()), &lots);
        }
    }
}

fn debit(e: &Env, a: &Address, lot: &Lot, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    let bal = read_balance(e, a, lot);
    if bal < amount {
        return Err(Error::InsufficientBalance);
    }
    write_balance(e, a, lot, bal - amount);
    Ok(())
}

fn read_parcel(e: &Env, id: &Symbol) -> Result<Parcel, Error> {
    e.storage().persistent().get(&Key::Parcel(id.clone())).ok_or(Error::ParcelNotFound)
}

fn read_i128(e: &Env, k: &Key) -> i128 {
    e.storage().instance().get(k).unwrap_or(0)
}

#[contractimpl]
impl GreenTon {
    pub fn __constructor(e: Env, admin: Address, oracle: Address) {
        e.storage().instance().set(&Key::Admin, &admin);
        e.storage().instance().set(&Key::Oracle, &oracle);
    }

    // ---- Metadatos ----
    pub fn name(e: Env) -> String {
        String::from_str(&e, "GreenTon")
    }
    pub fn symbol(e: Env) -> String {
        String::from_str(&e, "GTON")
    }
    pub fn decimals(_e: Env) -> u32 {
        0
    }

    // ---- Registro de predios ----
    /// El propietario registra su predio. La línea base se fija en la primera verificación.
    pub fn register_parcel(
        e: Env,
        owner: Address,
        parcel: Symbol,
        hectares: u32,
        bbox: String,
    ) -> Result<(), Error> {
        owner.require_auth();
        let key = Key::Parcel(parcel.clone());
        if e.storage().persistent().has(&key) {
            return Err(Error::ParcelExists);
        }
        let p = Parcel {
            owner: owner.clone(),
            hectares,
            bbox,
            baseline_ndvi_milli: 0,
            last_ndvi_milli: 0,
            frozen: false,
            issued_tco2e: 0,
        };
        e.storage().persistent().set(&key, &p);
        ParcelRegistered { parcel, owner }.publish(&e);
        Ok(())
    }

    // ---- Verificación satelital (solo oráculo) ----
    /// El oráculo reporta el NDVI del período y las toneladas verificadas.
    /// Emite al propietario un lote (predio, período) salvo que el predio esté (o quede) congelado.
    /// Devuelve las toneladas emitidas.
    pub fn submit_verification(
        e: Env,
        parcel: Symbol,
        period: u32,
        ndvi_milli: i32,
        tco2e: i128,
    ) -> Result<i128, Error> {
        let oracle: Address = e.storage().instance().get(&Key::Oracle).unwrap();
        oracle.require_auth();
        if tco2e < 0 {
            return Err(Error::InvalidAmount);
        }
        let mut p = read_parcel(&e, &parcel)?;
        if p.frozen {
            return Err(Error::ParcelFrozen);
        }
        let issued_key = Key::Issued(parcel.clone(), period);
        if e.storage().persistent().has(&issued_key) {
            return Err(Error::PeriodAlreadyIssued);
        }
        // Primera verificación: fija la línea base.
        if p.baseline_ndvi_milli == 0 {
            p.baseline_ndvi_milli = ndvi_milli;
        }
        let dropped = p.baseline_ndvi_milli - ndvi_milli > NDVI_MAX_DROP_MILLI;
        p.last_ndvi_milli = ndvi_milli;
        // El período queda consumido aunque se congele: no se puede reintentar.
        e.storage().persistent().set(&issued_key, &true);

        if ndvi_milli < NDVI_MIN_MILLI || dropped {
            p.frozen = true;
            e.storage().persistent().set(&Key::Parcel(parcel.clone()), &p);
            Frozen { parcel, period, ndvi_milli }.publish(&e);
            return Ok(0);
        }

        let owner = p.owner.clone();
        p.issued_tco2e += tco2e;
        e.storage().persistent().set(&Key::Parcel(parcel.clone()), &p);
        let lot = Lot { parcel: parcel.clone(), period };
        e.storage().persistent().set(
            &Key::LotInfo(lot.clone()),
            &LotInfo { minted: tco2e, ndvi_milli, ledger_time: e.ledger().timestamp() },
        );
        if tco2e > 0 {
            write_balance(&e, &owner, &lot, read_balance(&e, &owner, &lot) + tco2e);
        }
        let supply = read_i128(&e, &Key::Supply) + tco2e;
        e.storage().instance().set(&Key::Supply, &supply);
        Minted { parcel, period, amount: tco2e, ndvi_milli }.publish(&e);
        Ok(tco2e)
    }

    /// El admin (auditor humano) levanta el congelamiento tras revisar el predio.
    pub fn unfreeze(e: Env, parcel: Symbol) -> Result<(), Error> {
        let admin: Address = e.storage().instance().get(&Key::Admin).unwrap();
        admin.require_auth();
        let mut p = read_parcel(&e, &parcel)?;
        if !p.frozen {
            return Err(Error::NotFrozen);
        }
        p.frozen = false;
        p.baseline_ndvi_milli = p.last_ndvi_milli;
        e.storage().persistent().set(&Key::Parcel(parcel), &p);
        Ok(())
    }

    // ---- Token por lotes ----
    /// Saldo total de la cuenta, sumando todos sus lotes.
    pub fn balance(e: Env, who: Address) -> i128 {
        let mut total = 0;
        for lot in read_lots(&e, &who).iter() {
            total += read_balance(&e, &who, &lot);
        }
        total
    }

    pub fn lot_balance(e: Env, who: Address, parcel: Symbol, period: u32) -> i128 {
        read_balance(&e, &who, &Lot { parcel, period })
    }

    pub fn lots_of(e: Env, who: Address) -> Vec<LotBalance> {
        let mut out = Vec::new(&e);
        for lot in read_lots(&e, &who).iter() {
            let amount = read_balance(&e, &who, &lot);
            out.push_back(LotBalance { parcel: lot.parcel, period: lot.period, amount });
        }
        out
    }

    pub fn get_lot(e: Env, parcel: Symbol, period: u32) -> Option<LotInfo> {
        e.storage().persistent().get(&Key::LotInfo(Lot { parcel, period }))
    }

    pub fn total_supply(e: Env) -> i128 {
        read_i128(&e, &Key::Supply)
    }

    pub fn total_retired(e: Env) -> i128 {
        read_i128(&e, &Key::Retired)
    }

    pub fn transfer(
        e: Env,
        from: Address,
        to: Address,
        parcel: Symbol,
        period: u32,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();
        let lot = Lot { parcel: parcel.clone(), period };
        debit(&e, &from, &lot, amount)?;
        write_balance(&e, &to, &lot, read_balance(&e, &to, &lot) + amount);
        Transferred { from, to, parcel, period, amount }.publish(&e);
        Ok(())
    }

    /// Retira (quema) créditos de un lote para compensar huella. Irreversible y auditable.
    pub fn retire(
        e: Env,
        holder: Address,
        parcel: Symbol,
        period: u32,
        amount: i128,
        beneficiary: String,
    ) -> Result<u32, Error> {
        holder.require_auth();
        let lot = Lot { parcel: parcel.clone(), period };
        debit(&e, &holder, &lot, amount)?;
        let supply = read_i128(&e, &Key::Supply) - amount;
        e.storage().instance().set(&Key::Supply, &supply);
        let retired = read_i128(&e, &Key::Retired) + amount;
        e.storage().instance().set(&Key::Retired, &retired);

        let id: u32 = e.storage().instance().get(&Key::RetireCount).unwrap_or(0);
        let rec = Retirement {
            holder: holder.clone(),
            parcel: parcel.clone(),
            period,
            amount,
            beneficiary: beneficiary.clone(),
            ledger_time: e.ledger().timestamp(),
        };
        e.storage().persistent().set(&Key::Retirement(id), &rec);
        e.storage().instance().set(&Key::RetireCount, &(id + 1));
        Retired { holder, parcel, period, amount, beneficiary }.publish(&e);
        Ok(id)
    }

    // ---- Lectura ----
    pub fn get_parcel(e: Env, parcel: Symbol) -> Result<Parcel, Error> {
        read_parcel(&e, &parcel)
    }

    pub fn is_period_issued(e: Env, parcel: Symbol, period: u32) -> bool {
        e.storage().persistent().has(&Key::Issued(parcel, period))
    }

    pub fn retirement_count(e: Env) -> u32 {
        e.storage().instance().get(&Key::RetireCount).unwrap_or(0)
    }

    pub fn get_retirement(e: Env, id: u32) -> Option<Retirement> {
        e.storage().persistent().get(&Key::Retirement(id))
    }
}

mod test;
