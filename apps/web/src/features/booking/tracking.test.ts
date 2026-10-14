import type { BookingDto } from "@brand/shared";
import { describe, expect, it } from "vitest";
import { keepNewestTracking } from "./tracking";

const booking = (at: string | null, status = "accepted") =>
  ({ id: "b1", number: "BK-1001", status, tracking: at ? { lat: 28.4103, lng: 77.3189, heading: null, at } : null }) as unknown as BookingDto;

describe("live location on the customer's booking (plan C8)", () => {
  it("keeps the newer location from an event when a refetch brings the older saved one", () => {
    const merged = keepNewestTracking(booking("2026-10-06T04:27:10.000Z"), booking("2026-10-06T04:26:58.000Z", "arrived")) as BookingDto;
    expect(merged.tracking?.at).toBe("2026-10-06T04:27:10.000Z");
    // Everything else comes from the refetch.
    expect(merged.status).toBe("arrived");
  });

  it("takes a newer location from the refetch", () => {
    const merged = keepNewestTracking(booking("2026-10-06T04:26:58.000Z"), booking("2026-10-06T04:27:10.000Z")) as BookingDto;
    expect(merged.tracking?.at).toBe("2026-10-06T04:27:10.000Z");
  });

  it("takes the refetch as it is when either side has no location", () => {
    expect((keepNewestTracking(undefined, booking("2026-10-06T04:27:10.000Z")) as BookingDto).tracking?.at).toBe("2026-10-06T04:27:10.000Z");
    expect((keepNewestTracking(booking(null), booking("2026-10-06T04:27:10.000Z")) as BookingDto).tracking?.at).toBe("2026-10-06T04:27:10.000Z");
    expect((keepNewestTracking(booking("2026-10-06T04:27:10.000Z"), booking(null, "in_progress")) as BookingDto).tracking).toBeNull();
  });

  it("keeps the same object when nothing changed", () => {
    const previous = booking("2026-10-06T04:27:10.000Z");
    expect(keepNewestTracking(previous, booking("2026-10-06T04:27:10.000Z"))).toBe(previous);
  });
});
