#![cfg(test)]
use super::*;
use greenton::{GreenTon, GreenTonClient};
use soroban_sdk::{
    symbol_short,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Env,
};

const PERIOD: u32 = 202603;
const PRICE: i128 = 15_000_000; // 1,5 unidades del activo por tonelada
const FEE_BPS: u32 = 500; // 5 %

struct Setup {
    e: Env,
    gton: GreenTonClient<'static>,
    market: MarketClient<'static>,
    pay: TokenClient<'static>,
    pay_admin: StellarAssetClient<'static>,
    seller: Address,
    buyer: Address,
    treasury: Address,
}

fn setup() -> Setup {
    setup_with_fee(FEE_BPS)
}

fn setup_with_fee(fee_bps: u32) -> Setup {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let oracle = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let treasury = Address::generate(&e);

    let gton_id = e.register(GreenTon, (&admin, &oracle));
    let gton = GreenTonClient::new(&e, &gton_id);
    gton.register_parcel(
        &seller,
        &symbol_short!("IMPEN1"),
        &100,
        &String::from_str(&e, "-61.0,-25.0,-60.9,-24.9"),
    );
    gton.submit_verification(&symbol_short!("IMPEN1"), &PERIOD, &760, &100);

    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    let pay = TokenClient::new(&e, &sac.address());
    let pay_admin = StellarAssetClient::new(&e, &sac.address());
    pay_admin.mint(&buyer, &(1_000 * PRICE));

    let market_id = e.register(Market, (&gton_id, &sac.address(), &treasury, &fee_bps));
    let market = MarketClient::new(&e, &market_id);
    Setup { e, gton, market, pay, pay_admin, seller, buyer, treasury }
}

fn p() -> Symbol {
    symbol_short!("IMPEN1")
}

fn name(e: &Env) -> String {
    String::from_str(e, "Empresa Transporte Norte SA")
}

#[test]
fn listing_puts_the_lot_in_custody() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &60, &PRICE);
    assert_eq!(id, 0);
    assert_eq!(s.gton.lot_balance(&s.seller, &p(), &PERIOD), 40);
    assert_eq!(s.gton.lot_balance(&s.market.address, &p(), &PERIOD), 60);
    let o = s.market.get_offer(&id).unwrap();
    assert_eq!(o.available, 60);
    assert!(o.open);
}

#[test]
fn full_purchase_pays_seller_and_burns_lot() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &60, &PRICE);
    let purchase = s.market.buy_and_retire(&s.buyer, &id, &60, &name(&s.e));

    let total = 60 * PRICE;
    let fee = total * FEE_BPS as i128 / 10_000;
    assert_eq!(s.pay.balance(&s.seller), total - fee);
    assert_eq!(s.pay.balance(&s.treasury), fee);
    assert_eq!(s.pay.balance(&s.buyer), 940 * PRICE);
    assert_eq!(s.gton.lot_balance(&s.market.address, &p(), &PERIOD), 0);
    assert_eq!(s.gton.total_supply(), 40);
    assert_eq!(s.gton.total_retired(), 60);
    assert!(!s.market.get_offer(&id).unwrap().open);

    let rec = s.market.get_purchase(&purchase).unwrap();
    assert_eq!(rec.buyer, s.buyer);
    assert_eq!(rec.paid, total);
    assert_eq!(rec.fee, fee);
    let r = s.gton.get_retirement(&rec.retirement_id).unwrap();
    assert_eq!(r.parcel, p());
    assert_eq!(r.period, PERIOD);
    assert_eq!(r.amount, 60);
    assert_eq!(r.beneficiary, name(&s.e));
}

#[test]
fn partial_purchases_until_closed() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &50, &PRICE);
    s.market.buy_and_retire(&s.buyer, &id, &20, &name(&s.e));
    let o = s.market.get_offer(&id).unwrap();
    assert_eq!(o.available, 30);
    assert!(o.open);

    s.market.buy_and_retire(&s.buyer, &id, &30, &name(&s.e));
    let o = s.market.get_offer(&id).unwrap();
    assert_eq!(o.available, 0);
    assert!(!o.open);
    assert_eq!(s.market.purchase_count(), 2);
    assert_eq!(s.gton.total_retired(), 50);

    let r = s.market.try_buy_and_retire(&s.buyer, &id, &1, &name(&s.e));
    assert_eq!(r, Err(Ok(Error::OfferClosed)));
}

#[test]
fn cancel_returns_the_remainder() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &50, &PRICE);
    s.market.buy_and_retire(&s.buyer, &id, &20, &name(&s.e));
    s.market.cancel(&s.seller, &id);
    assert_eq!(s.gton.lot_balance(&s.seller, &p(), &PERIOD), 80);
    assert_eq!(s.gton.lot_balance(&s.market.address, &p(), &PERIOD), 0);
    assert!(!s.market.get_offer(&id).unwrap().open);

    let r = s.market.try_buy_and_retire(&s.buyer, &id, &1, &name(&s.e));
    assert_eq!(r, Err(Ok(Error::OfferClosed)));
}

#[test]
fn cannot_buy_more_than_available() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &10, &PRICE);
    let r = s.market.try_buy_and_retire(&s.buyer, &id, &11, &name(&s.e));
    assert_eq!(r, Err(Ok(Error::AmountExceedsAvailable)));
}

#[test]
fn failed_payment_leaves_no_partial_state() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &10, &PRICE);
    let poor = Address::generate(&s.e);
    s.pay_admin.mint(&poor, &(PRICE - 1));

    let r = s.market.try_buy_and_retire(&poor, &id, &1, &name(&s.e));
    assert!(r.is_err());
    assert_eq!(s.pay.balance(&poor), PRICE - 1);
    assert_eq!(s.pay.balance(&s.seller), 0);
    assert_eq!(s.gton.lot_balance(&s.market.address, &p(), &PERIOD), 10);
    assert_eq!(s.gton.total_supply(), 100);
    assert_eq!(s.gton.retirement_count(), 0);
    assert_eq!(s.market.get_offer(&id).unwrap().available, 10);
    assert_eq!(s.market.purchase_count(), 0);
}

#[test]
fn only_the_seller_can_cancel() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &10, &PRICE);
    let r = s.market.try_cancel(&s.buyer, &id);
    assert_eq!(r, Err(Ok(Error::NotSeller)));
    assert_eq!(s.gton.lot_balance(&s.market.address, &p(), &PERIOD), 10);
}

#[test]
fn rejects_invalid_listing() {
    let s = setup();
    assert_eq!(
        s.market.try_list(&s.seller, &p(), &PERIOD, &0, &PRICE),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.market.try_list(&s.seller, &p(), &PERIOD, &10, &0),
        Err(Ok(Error::InvalidPrice))
    );
    assert_eq!(
        s.market.try_buy_and_retire(&s.buyer, &99, &1, &name(&s.e)),
        Err(Ok(Error::OfferNotFound))
    );
}

#[test]
fn fee_rounds_down_in_favor_of_the_seller() {
    let s = setup();
    // 1 tonelada a 19 unidades mínimas: 19 * 5 % = 0,95 -> comisión 0.
    let id = s.market.list(&s.seller, &p(), &PERIOD, &1, &19);
    s.market.buy_and_retire(&s.buyer, &id, &1, &name(&s.e));
    assert_eq!(s.pay.balance(&s.seller), 19);
    assert_eq!(s.pay.balance(&s.treasury), 0);

    // 3 toneladas a 19: total 57, 5 % = 2,85 -> comisión 2, vendedor 55.
    let id = s.market.list(&s.seller, &p(), &PERIOD, &3, &19);
    let pid = s.market.buy_and_retire(&s.buyer, &id, &3, &name(&s.e));
    assert_eq!(s.market.get_purchase(&pid).unwrap().fee, 2);
    assert_eq!(s.pay.balance(&s.treasury), 2);
    assert_eq!(s.pay.balance(&s.seller), 19 + 55);
}

#[test]
fn seller_plus_treasury_always_equals_what_the_buyer_paid() {
    let s = setup();
    let id = s.market.list(&s.seller, &p(), &PERIOD, &97, &PRICE);
    let before = s.pay.balance(&s.buyer);
    s.market.buy_and_retire(&s.buyer, &id, &37, &name(&s.e));
    let spent = before - s.pay.balance(&s.buyer);
    assert_eq!(spent, 37 * PRICE);
    assert_eq!(s.pay.balance(&s.seller) + s.pay.balance(&s.treasury), spent);
}

#[test]
fn zero_fee_pays_the_seller_everything() {
    let s = setup_with_fee(0);
    assert_eq!(s.market.fee_bps(), 0);
    let id = s.market.list(&s.seller, &p(), &PERIOD, &10, &PRICE);
    let pid = s.market.buy_and_retire(&s.buyer, &id, &10, &name(&s.e));
    assert_eq!(s.pay.balance(&s.seller), 10 * PRICE);
    assert_eq!(s.pay.balance(&s.treasury), 0);
    assert_eq!(s.market.get_purchase(&pid).unwrap().fee, 0);
}

#[test]
fn fee_and_treasury_are_readable() {
    let s = setup();
    assert_eq!(s.market.fee_bps(), FEE_BPS);
    assert_eq!(s.market.treasury(), s.treasury);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn constructor_rejects_a_fee_above_the_cap() {
    let e = Env::default();
    let a = Address::generate(&e);
    e.register(Market, (&a, &a, &a, &(MAX_FEE_BPS + 1)));
}

#[test]
fn constructor_accepts_the_exact_cap() {
    let e = Env::default();
    let a = Address::generate(&e);
    let id = e.register(Market, (&a, &a, &a, &MAX_FEE_BPS));
    assert_eq!(MarketClient::new(&e, &id).fee_bps(), MAX_FEE_BPS);
}
