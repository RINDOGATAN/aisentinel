import { describe, expect, it } from "vitest";
import { isCronAuthorized, safeEqual, safeEqualAny } from "./safe-equal";

describe("safeEqual", () => {
  it("accepts equal strings and refuses different ones, including length differences", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("safeEqualAny", () => {
  it("matches any configured entry and none when the list is empty", () => {
    expect(safeEqualAny("k2", ["k1", "k2", "k3"])).toBe(true);
    expect(safeEqualAny("k4", ["k1", "k2"])).toBe(false);
    expect(safeEqualAny("k1", [])).toBe(false);
  });
});

describe("isCronAuthorized", () => {
  it("needs exactly `Bearer <secret>`", () => {
    expect(isCronAuthorized("Bearer s3cret", "s3cret")).toBe(true);
    expect(isCronAuthorized("Bearer wrong", "s3cret")).toBe(false);
    expect(isCronAuthorized("s3cret", "s3cret")).toBe(false);
    expect(isCronAuthorized(null, "s3cret")).toBe(false);
  });
  it("refuses everyone when the secret is unset or empty", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
  });
});
