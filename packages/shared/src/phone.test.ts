import { describe, expect, it } from "vitest";
import { formatIndianMobile, isIndianMobile, mobileDigits } from "./phone";

describe("formatIndianMobile", () => {
  it("groups ten digits as 5 + 5", () => {
    expect(formatIndianMobile("9876543210")).toBe("98765 43210");
  });

  it("leaves short input ungrouped while typing", () => {
    expect(formatIndianMobile("98765")).toBe("98765");
    expect(formatIndianMobile("987654")).toBe("98765 4");
  });

  it("ignores non-digits and extra digits", () => {
    expect(formatIndianMobile("98765-43210 99")).toBe("98765 43210");
  });
});

describe("mobileDigits", () => {
  it("strips spaces, dashes and a pasted +91", () => {
    expect(mobileDigits("+91 98765-43210")).toBe("9876543210");
    expect(mobileDigits("98765 43210")).toBe("9876543210");
  });

  it("strips 91 from a pasted 12-digit number and the 0 trunk prefix", () => {
    expect(mobileDigits("919876543210")).toBe("9876543210");
    expect(mobileDigits("09876543210")).toBe("9876543210");
  });

  it("keeps a number that itself starts with 91", () => {
    expect(mobileDigits("9198765432")).toBe("9198765432");
  });

  it("ignores an extra keystroke on a complete number", () => {
    expect(mobileDigits("91987654321")).toBe("9198765432");
    expect(mobileDigits("98765 432109")).toBe("9876543210");
  });
});

describe("isIndianMobile", () => {
  it("accepts 10 digits starting with 6–9", () => {
    expect(isIndianMobile("9876543210")).toBe(true);
    expect(isIndianMobile("6000000000")).toBe(true);
  });

  it("rejects landlines, short numbers and formatting", () => {
    expect(isIndianMobile("5876543210")).toBe(false);
    expect(isIndianMobile("987654321")).toBe(false);
    expect(isIndianMobile("98765 43210")).toBe(false);
  });
});
