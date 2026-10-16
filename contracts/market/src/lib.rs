#![no_std]
//! Mercado de GreenTon: compra y quema atómica de lotes.
//!
//! El vendedor publica una oferta sobre un lote (predio, período) y el mercado custodia esas
//! toneladas. El comprador paga con un activo de Stellar (SAC) y, en la misma transacción,
//! el mercado retira (quema) las toneladas a nombre del beneficiario. No hay compra sin quema.

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
    pub paid: i128,
    pub retirement_id: u32,
}

#[contracttype]
enum Key {
    GreenTon,
    PaymentAsset,
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
    pub fn __constructor(e: Env, greenton: Address, payment_asset: Address) {
        e.storage().instance().set(&Key::GreenTon, &greenton);
        e.storage().instance().set(&Key::PaymentAsset, &payment_asset);
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

    /// Paga al vendedor y quema `amount` toneladas del lote a nombre de `beneficiary`,
    /// todo en la misma transacción. Devuelve el ID de la compra.
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

        offer.available -= amount;
        offer.open = offer.available > 0;
        e.storage().persistent().set(&Key::Offer(offer_id), &offer);

        let asset: Address = e.storage().instance().get(&Key::PaymentAsset).unwrap();
        token::TokenClient::new(&e, &asset).transfer(&buyer, &offer.seller, &paid);
        let retirement_id = greenton(&e).retire(
            &e.current_contract_address(),
            &offer.parcel,
            &offer.period,
            &amount,
            &beneficiary,
        );

        let id = read_count(&e, &Key::PurchaseCount);
        let purchase = Purchase { buyer: buyer.clone(), offer_id, amount, paid, retirement_id };
        e.storage().persistent().set(&Key::Purchase(id), &purchase);
        e.storage().instance().set(&Key::PurchaseCount, &(id + 1));
        Purchased {
            offer_id,
            buyer,
            parcel: offer.parcel,
            period: offer.period,
            amount,
            paid,
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
}

mod test;
