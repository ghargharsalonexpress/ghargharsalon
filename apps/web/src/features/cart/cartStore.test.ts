import { beforeEach, describe, expect, it } from "vitest";
import { cartCount, cartEstimatePaise, useCart } from "./cartStore";

const service = (slug: string, pricePaise = 64_900, tierId = "standard") => ({
  serviceSlug: slug,
  tierId,
  unitPricePaise: pricePaise,
  name: { en: slug, hi: "" },
  tierLabel: { en: "Standard", hi: "स्टैंडर्ड" },
  tierCount: 1,
  durationMin: 45,
});

describe("cart store (W1)", () => {
  beforeEach(() => useCart.setState({ lines: [], maxQuantity: 3, heldFor: undefined }));

  it("adds a line once, then raises its quantity up to the limit", () => {
    const { add } = useCart.getState();
    add(service("fruit-facial"));
    add(service("fruit-facial"));
    add(service("fruit-facial"));
    add(service("fruit-facial"));
    const { lines } = useCart.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ key: "fruit-facial:standard", quantity: 3 });
  });

  it("keeps each option of a service as its own line", () => {
    const { add } = useCart.getState();
    add(service("korean-glow", 99_900, "single"));
    add(service("korean-glow", 2_69_900, "three-sessions"));
    expect(useCart.getState().lines.map((line) => line.key)).toEqual(["korean-glow:single", "korean-glow:three-sessions"]);
  });

  it("clamps quantities to the limit and removes a line set below one", () => {
    const { add, setQuantity } = useCart.getState();
    add(service("wax"));
    setQuantity("wax:standard", 9);
    expect(useCart.getState().lines[0]?.quantity).toBe(3);
    setQuantity("wax:standard", 0);
    expect(useCart.getState().lines).toEqual([]);
  });

  it("applies the server's prices and limit without dropping anything silently", () => {
    const { add, setQuantity, sync } = useCart.getState();
    add(service("fruit-facial", 49_900));
    setQuantity("fruit-facial:standard", 3);
    add(service("beard-trim", 24_900));
    sync(
      [{ key: "fruit-facial:standard", unitPricePaise: 64_900, quantity: 2, name: { en: "Fruit facial", hi: "फ्रूट फ़ेशियल" }, tierLabel: { en: "Standard", hi: "स्टैंडर्ड" } }],
      2,
    );
    const { lines, maxQuantity } = useCart.getState();
    expect(maxQuantity).toBe(2);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ unitPricePaise: 64_900, quantity: 2, name: { hi: "फ्रूट फ़ेशियल" } });
    // A line the server said nothing about stays as it was.
    expect(lines[1]).toMatchObject({ key: "beard-trim:standard", unitPricePaise: 24_900, quantity: 1 });
  });

  it("empties when the booking made from it is paid on the booking's own page", () => {
    const { add, hold, settle } = useCart.getState();
    add(service("fruit-facial"));
    hold("booking-1");
    settle("another-booking");
    expect(useCart.getState().lines).toHaveLength(1);
    settle("booking-1");
    expect(useCart.getState().lines).toEqual([]);
  });

  it("keeps a cart that changed after checkout made the booking", () => {
    const { add, hold, settle } = useCart.getState();
    add(service("fruit-facial"));
    hold("booking-1");
    add(service("wax"));
    settle("booking-1");
    expect(useCart.getState().lines).toHaveLength(2);
  });

  it("counts items and estimates the total in paise", () => {
    const { add, setQuantity } = useCart.getState();
    add(service("fruit-facial", 64_900));
    add(service("wax", 34_900));
    setQuantity("wax:standard", 2);
    const { lines } = useCart.getState();
    expect(cartCount(lines)).toBe(3);
    expect(cartEstimatePaise(lines)).toBe(64_900 + 2 * 34_900);
  });
});
