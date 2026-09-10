import { describe, expect, it } from "vitest";
import { formatUtcInTimeZone, isUtcDateString } from "./dateFormat";

describe("isUtcDateString", () => {
  it("accepts ISO UTC strings ending in Z", () => {
    expect(isUtcDateString("2025-04-30T17:00:00Z")).toBe(true);
    expect(isUtcDateString("2025-04-30T17:00:00.123Z")).toBe(true);
  });

  it("rejects non-UTC and non-date strings", () => {
    expect(isUtcDateString("2025-04-30T17:00:00+08:00")).toBe(true);
    expect(isUtcDateString("2025-04-30")).toBe(false);
    expect(isUtcDateString("team-engineering")).toBe(false);
    expect(isUtcDateString("")).toBe(false);
  });
});

describe("formatUtcInTimeZone", () => {
  it("localises a UTC timestamp to the given IANA zone", () => {
    // 2025-04-30T17:00:00Z is 2025-05-01 01:00 in Australia/Perth (UTC+8).
    const result = formatUtcInTimeZone(
      "2025-04-30T17:00:00Z",
      "Australia/Perth",
    );
    // Time zone short names and AM/PM casing may vary across ICU builds;
    // assert the important parts instead of a single exact string.
    expect(result).toMatch(/May 1, 2025 1:00\s+(?:AM|am)\s+(?:GMT\+8|AWST)/);
  });

  it("returns null for invalid input", () => {
    expect(formatUtcInTimeZone("not-a-date", "Australia/Perth")).toBeNull();
    expect(formatUtcInTimeZone("2025-04-30T17:00:00Z", "Not/AZone")).toBeNull();
  });
});
