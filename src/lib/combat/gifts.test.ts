import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultConfig, resolveGiftAttack, resolveLikeFighter } from "./gifts.ts";

describe("resolveGiftAttack", () => {
  const config = defaultConfig();

  it("scales punch hits with quantity and keeps unit diamond damage", () => {
    const r = resolveGiftAttack(config, {
      sender: "ana",
      giftName: "Rosa",
      giftId: "rose",
      diamonds: 1,
      repeatCount: 10,
    });
    assert.equal(r.fighter, "lula");
    assert.equal(r.action, "punch");
    assert.equal(r.hits, 10);
    assert.equal(r.damage, 8);
    assert.equal(r.diamonds, 10);
    assert.equal(r.quantity, 10);
  });

  it("scales damage with incoming diamonds vs mapping diamonds", () => {
    const r = resolveGiftAttack(config, {
      sender: "bob",
      giftName: "Óculos",
      giftId: "sunglasses",
      diamonds: 20,
      repeatCount: 1,
    });
    assert.equal(r.fighter, "flavio");
    assert.equal(r.damage, 36);
    assert.equal(r.hits, 1);
    assert.equal(r.diamonds, 20);
  });

  it("folds quantity into a single special hit", () => {
    const r = resolveGiftAttack(config, {
      sender: "cia",
      giftName: "Rosquinha",
      giftId: "donut",
      diamonds: 30,
      repeatCount: 3,
    });
    assert.equal(r.action, "special");
    assert.equal(r.fighter, "lula");
    assert.equal(r.hits, 1);
    assert.equal(r.damage, 126);
    assert.equal(r.diamonds, 90);
  });

  it("multiplies combo hits by quantity", () => {
    const r = resolveGiftAttack(config, {
      sender: "dan",
      giftName: "Mini Dino",
      giftId: "dino",
      diamonds: 5,
      repeatCount: 2,
    });
    assert.equal(r.action, "combo");
    assert.equal(r.hits, 6);
    assert.equal(r.damage, 12);
    assert.equal(r.diamonds, 10);
  });

  it("sends unmapped gifts to Flávio with 2 dmg per diamond", () => {
    const r = resolveGiftAttack(config, {
      sender: "eve",
      giftName: "Pizza Hat",
      diamonds: 50,
      repeatCount: 1,
    });
    assert.equal(r.fighter, "flavio");
    assert.equal(r.action, "punch");
    assert.equal(r.damage, 100);
    assert.equal(r.diamonds, 50);
  });

  it("treats likes as champion punches", () => {
    const r = resolveGiftAttack(config, {
      sender: "fan",
      giftName: "Curtida",
      giftId: "like",
      diamonds: 1,
      repeatCount: 1,
    });
    assert.equal(r.fighter, "lula");
    assert.equal(r.damage, 6);
    assert.equal(r.hits, 1);
    assert.equal(resolveLikeFighter({ likeFighter: "flavio", championId: "lula" }), "flavio");
  });
});
