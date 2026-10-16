#![cfg(test)]
use super::*;
use soroban_sdk::{symbol_short, testutils::Address as _, Env};

struct Setup {
    e: Env,
    c: GreenTonClient<'static>,
    owner: Address,
    oracle: Address,
}

fn setup() -> Setup {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let oracle = Address::generate(&e);
    let owner = Address::generate(&e);
    let id = e.register(GreenTon, (&admin, &oracle));
    let c = GreenTonClient::new(&e, &id);
    c.register_parcel(
        &owner,
        &symbol_short!("IBERA1"),
        &120,
        &String::from_str(&e, "-57.2,-28.4,-57.1,-28.3"),
    );
    Setup { e, c, owner, oracle }
}

#[test]
fn mint_then_retire() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    assert_eq!(s.c.submit_verification(&p, &202510, &720, &50), 50);
    assert_eq!(s.c.balance(&s.owner), 50);
    assert_eq!(s.c.total_supply(), 50);

    let id = s.c.retire(&s.owner, &20, &String::from_str(&s.e, "Empresa SA"));
    assert_eq!(id, 0);
    assert_eq!(s.c.balance(&s.owner), 30);
    assert_eq!(s.c.total_supply(), 30);
    assert_eq!(s.c.total_retired(), 20);
    assert_eq!(s.c.get_retirement(&0).unwrap().amount, 20);
}

#[test]
fn same_period_cannot_be_issued_twice() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202510, &700, &10);
    let r = s.c.try_submit_verification(&p, &202510, &700, &10);
    assert_eq!(r, Err(Ok(Error::PeriodAlreadyIssued)));
    assert_eq!(s.c.total_supply(), 10);
}

#[test]
fn ndvi_drop_freezes_parcel_and_blocks_mint() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202509, &720, &10);
    // Tala: NDVI cae 300 milésimas -> congela, no emite.
    assert_eq!(s.c.submit_verification(&p, &202510, &420, &10), 0);
    assert!(s.c.get_parcel(&p).frozen);
    assert_eq!(s.c.total_supply(), 10);
    let r = s.c.try_submit_verification(&p, &202511, &720, &10);
    assert_eq!(r, Err(Ok(Error::ParcelFrozen)));
}

#[test]
fn low_absolute_ndvi_freezes() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    assert_eq!(s.c.submit_verification(&p, &202510, &300, &10), 0);
    assert!(s.c.get_parcel(&p).frozen);
}

#[test]
fn cannot_retire_more_than_balance() {
    let s = setup();
    s.c.submit_verification(&symbol_short!("IBERA1"), &202510, &700, &5);
    let r = s.c.try_retire(&s.owner, &6, &String::from_str(&s.e, "x"));
    assert_eq!(r, Err(Ok(Error::InsufficientBalance)));
}

#[test]
fn transfer_moves_balance() {
    let s = setup();
    s.c.submit_verification(&symbol_short!("IBERA1"), &202510, &700, &5);
    let buyer = Address::generate(&s.e);
    s.c.transfer(&s.owner, &buyer, &3);
    assert_eq!(s.c.balance(&buyer), 3);
    assert_eq!(s.c.balance(&s.owner), 2);
}

#[test]
fn unknown_parcel_rejected() {
    let s = setup();
    let r = s.c.try_submit_verification(&symbol_short!("NOPE"), &1, &700, &5);
    assert_eq!(r, Err(Ok(Error::ParcelNotFound)));
    let _ = &s.oracle;
}
