#![no_std]
//! Mercado de GreenTon: compra y quema atómica de lotes.
//!
//! El vendedor publica una oferta sobre un lote (predio, período) y el mercado custodia esas
//! toneladas. El comprador paga con un activo de Stellar (SAC) y, en la misma transacción,
//! el mercado reparte el pago (vendedor y comisión de plataforma) y retira (quema) las toneladas
//! a nombre del beneficiario. No hay compra sin quema.

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, token,
    Address, Env, String, Symbol,
};

/// Interfaz de GreenTon que usa el mercado.
#[contractclient(name = "GreenTonApiClient")]
pub trait GreenTonApi {
    fn transfer(e: Env, from: Address, to: Address, parcel: Symbol, period: u32, amount: i128);
    fn retire(
        e: Env,
        holder: Address,
        parcel: Symbol,
        period: u32,
        amount: i128,
        beneficiary: String,
    ) -> u32;
}

/// Comisión máxima de la plataforma, en puntos básicos (1000 = 10 %).
pub const MAX_FEE_BPS: u32 = 1_000;
const BPS: i128 = 10_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InvalidPrice = 2,
    OfferNotFound = 3,
    OfferClosed = 4,
    AmountExceedsAvailable = 5,
    NotSeller = 6,
    InvalidFee = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Offer {
    pub seller: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub available: i128,
    /// En la unidad mínima del activo de pago (XLM y USDC: 7 decimales).
    pub price_per_ton: i128,
    pub open: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Purchase {
    pub buyer: Address,
    pub offer_id: u32,
    pub amount: i128,
    /// Total pagado por el comprador (incluye la comisión).
    pub paid: i128,
    /// Parte de `paid` que fue a la tesorería; el vendedor recibió `paid - fee`.
    pub fee: i128,
    pub retirement_id: u32,
}

#[contracttype]
enum Key {
    GreenTon,
    PaymentAsset,
    Treasury,
    FeeBps,
    OfferCount,
    PurchaseCount,
    Offer(u32),
    Purchase(u32),
}

#[contractevent]
pub struct Listed {
    #[topic]
    pub offer_id: u32,
    pub seller: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
    pub price_per_ton: i128,
}

#[contractevent]
pub struct Purchased {
    #[topic]
    pub offer_id: u32,
    pub buyer: Address,
    pub parcel: Symbol,
    pub period: u32,
    pub amount: i128,
    pub paid: i128,
    pub fee: i128,
    pub retirement_id: u32,
}

#[contractevent]
pub struct Cancelled {
    #[topic]
    pub offer_id: u32,
    pub returned: i128,
}

#[contract]
pub struct Market;

fn greenton(e: &Env) -> GreenTonApiClient<'_> {
    let id: Address = e.storage().instance().get(&Key::GreenTon).unwrap();
    GreenTonApiClient::new(e, &id)
}

fn read_offer(e: &Env, id: u32) -> Result<Offer, Error> {
    e.storage().persistent().get(&Key::Offer(id)).ok_or(Error::OfferNotFound)
}

fn read_count(e: &Env, k: &Key) -> u32 {
    e.storage().instance().get(k).unwrap_or(0)
}

#[contractimpl]
impl Market {
    /// `fee_bps` es la comisión de la plataforma sobre cada compra (0 a `MAX_FEE_BPS`) y
    /// `treasury` la cuenta que la recibe.
    pub fn __constructor(
        e: Env,
        greenton: Address,
        payment_asset: Address,
        treasury: Address,
        fee_bps: u32,
    ) -> Result<(), Error> {
        if fee_bps > MAX_FEE_BPS {
            return Err(Error::InvalidFee);
        }
        e.storage().instance().set(&Key::GreenTon, &greenton);
        e.storage().instance().set(&Key::PaymentAsset, &payment_asset);
        e.storage().instance().set(&Key::Treasury, &treasury);
        e.storage().instance().set(&Key::FeeBps, &fee_bps);
        Ok(())
    }

    /// Publica una oferta sobre un lote y lo pone en custodia del mercado. Devuelve el ID.
    pub fn list(
        e: Env,
        seller: Address,
        parcel: Symbol,
        period: u32,
        amount: i128,
        price_per_ton: i128,
    ) -> Result<u32, Error> {
        seller.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if price_per_ton <= 0 {
            return Err(Error::InvalidPrice);
        }
        greenton(&e).transfer(&seller, &e.current_contract_address(), &parcel, &period, &amount);

        let id = read_count(&e, &Key::OfferCount);
        let offer = Offer {
            seller: seller.clone(),
            parcel: parcel.clone(),
            period,
            available: amount,
            price_per_ton,
            open: true,
        };
        e.storage().persistent().set(&Key::Offer(id), &offer);
        e.storage().instance().set(&Key::OfferCount, &(id + 1));
        Listed { offer_id: id, seller, parcel, period, amount, price_per_ton }.publish(&e);
        Ok(id)
    }

    /// Cobra al comprador, paga al vendedor (menos la comisión, que va a la tesorería) y quema
    /// `amount` toneladas del lote a nombre de `beneficiary`, todo en la misma transacción.
    /// La comisión se redondea hacia abajo, a favor del vendedor. Devuelve el ID de la compra.
    pub fn buy_and_retire(
        e: Env,
        buyer: Address,
        offer_id: u32,
        amount: i128,
        beneficiary: String,
    ) -> Result<u32, Error> {
        buyer.require_auth();
        let mut offer = read_offer(&e, offer_id)?;
        if !offer.open {
            return Err(Error::OfferClosed);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if amount > offer.available {
            return Err(Error::AmountExceedsAvailable);
        }
        let paid = amount * offer.price_per_ton;
        let fee_bps: u32 = e.storage().instance().get(&Key::FeeBps).unwrap();
        let fee = paid * fee_bps as i128 / BPS;

        offer.available -= amount;
        offer.open = offer.available > 0;
        e.storage().persistent().set(&Key::Offer(offer_id), &offer);

        let asset: Address = e.storage().instance().get(&Key::PaymentAsset).unwrap();
        let pay = token::TokenClient::new(&e, &asset);
        pay.transfer(&buyer, &offer.seller, &(paid - fee));
        if fee > 0 {
            let treasury: Address = e.storage().instance().get(&Key::Treasury).unwrap();
            pay.transfer(&buyer, &treasury, &fee);
        }
        let retirement_id = greenton(&e).retire(
            &e.current_contract_address(),
            &offer.parcel,
            &offer.period,
            &amount,
            &beneficiary,
        );

        let id = read_count(&e, &Key::PurchaseCount);
        let purchase = Purchase { buyer: buyer.clone(), offer_id, amount, paid, fee, retirement_id };
        e.storage().persistent().set(&Key::Purchase(id), &purchase);
        e.storage().instance().set(&Key::PurchaseCount, &(id + 1));
        Purchased {
            offer_id,
            buyer,
            parcel: offer.parcel,
            period: offer.period,
            amount,
            paid,
            fee,
            retirement_id,
        }
        .publish(&e);
        Ok(id)
    }

    /// Cierra la oferta y devuelve al vendedor las toneladas no vendidas.
    pub fn cancel(e: Env, seller: Address, offer_id: u32) -> Result<(), Error> {
        seller.require_auth();
        let mut offer = read_offer(&e, offer_id)?;
        if offer.seller != seller {
            return Err(Error::NotSeller);
        }
        if !offer.open {
            return Err(Error::OfferClosed);
        }
        let returned = offer.available;
        offer.available = 0;
        offer.open = false;
        e.storage().persistent().set(&Key::Offer(offer_id), &offer);
        greenton(&e).transfer(
            &e.current_contract_address(),
            &seller,
            &offer.parcel,
            &offer.period,
            &returned,
        );
        Cancelled { offer_id, returned }.publish(&e);
        Ok(())
    }

    // ---- Lectura ----
    pub fn get_offer(e: Env, offer_id: u32) -> Option<Offer> {
        e.storage().persistent().get(&Key::Offer(offer_id))
    }

    pub fn offer_count(e: Env) -> u32 {
        read_count(&e, &Key::OfferCount)
    }

    pub fn get_purchase(e: Env, purchase_id: u32) -> Option<Purchase> {
        e.storage().persistent().get(&Key::Purchase(purchase_id))
    }

    pub fn purchase_count(e: Env) -> u32 {
        read_count(&e, &Key::PurchaseCount)
    }

    pub fn greenton_id(e: Env) -> Address {
        e.storage().instance().get(&Key::GreenTon).unwrap()
    }

    pub fn payment_asset(e: Env) -> Address {
        e.storage().instance().get(&Key::PaymentAsset).unwrap()
    }

    pub fn treasury(e: Env) -> Address {
        e.storage().instance().get(&Key::Treasury).unwrap()
    }

    pub fn fee_bps(e: Env) -> u32 {
        e.storage().instance().get(&Key::FeeBps).unwrap()
    }
}

mod test;
