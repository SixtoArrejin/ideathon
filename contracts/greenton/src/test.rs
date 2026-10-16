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

    let id = s.c.retire(&s.owner, &p, &202510, &20, &String::from_str(&s.e, "Empresa SA"));
    assert_eq!(id, 0);
    assert_eq!(s.c.balance(&s.owner), 30);
    assert_eq!(s.c.total_supply(), 30);
    assert_eq!(s.c.total_retired(), 20);
    let r = s.c.get_retirement(&0).unwrap();
    assert_eq!(r.amount, 20);
    assert_eq!(r.parcel, p);
    assert_eq!(r.period, 202510);
}

#[test]
fn each_period_is_its_own_lot() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202509, &720, &10);
    s.c.submit_verification(&p, &202510, &710, &7);

    let lots = s.c.lots_of(&s.owner);
    assert_eq!(lots.len(), 2);
    assert_eq!(s.c.lot_balance(&s.owner, &p, &202509), 10);
    assert_eq!(s.c.lot_balance(&s.owner, &p, &202510), 7);
    assert_eq!(s.c.balance(&s.owner), 17);

    let info = s.c.get_lot(&p, &202510).unwrap();
    assert_eq!(info.minted, 7);
    assert_eq!(info.ndvi_milli, 710);
}

#[test]
fn cannot_spend_one_lot_with_another() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202509, &720, &10);
    s.c.submit_verification(&p, &202510, &710, &2);
    let r = s.c.try_retire(&s.owner, &p, &202510, &5, &String::from_str(&s.e, "x"));
    assert_eq!(r, Err(Ok(Error::InsufficientBalance)));
    assert_eq!(s.c.balance(&s.owner), 12);
}

#[test]
fn transfer_moves_only_the_given_lot() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202509, &720, &10);
    s.c.submit_verification(&p, &202510, &710, &5);
    let buyer = Address::generate(&s.e);
    s.c.transfer(&s.owner, &buyer, &p, &202510, &3);

    assert_eq!(s.c.lot_balance(&buyer, &p, &202510), 3);
    assert_eq!(s.c.lot_balance(&buyer, &p, &202509), 0);
    assert_eq!(s.c.lot_balance(&s.owner, &p, &202510), 2);
    assert_eq!(s.c.lot_balance(&s.owner, &p, &202509), 10);
    assert_eq!(s.c.lots_of(&buyer).len(), 1);
}

#[test]
fn emptied_lot_leaves_the_account_index() {
    let s = setup();
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202510, &720, &4);
    let buyer = Address::generate(&s.e);
    s.c.transfer(&s.owner, &buyer, &p, &202510, &4);
    assert_eq!(s.c.lots_of(&s.owner).len(), 0);
    assert_eq!(s.c.balance(&s.owner), 0);
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
    assert_eq!(s.c.get_lot(&p, &202510), None);
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
    let p = symbol_short!("IBERA1");
    s.c.submit_verification(&p, &202510, &700, &5);
    let r = s.c.try_retire(&s.owner, &p, &202510, &6, &String::from_str(&s.e, "x"));
    assert_eq!(r, Err(Ok(Error::InsufficientBalance)));
}

#[test]
fn unknown_parcel_rejected() {
    let s = setup();
    let r = s.c.try_submit_verification(&symbol_short!("NOPE"), &1, &700, &5);
    assert_eq!(r, Err(Ok(Error::ParcelNotFound)));
    let _ = &s.oracle;
}
