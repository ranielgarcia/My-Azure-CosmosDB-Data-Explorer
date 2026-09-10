import { describe, expect, it } from "vitest";
import {
  batchZoneIds,
  buildZoneLabels,
  collectZoneIds,
} from "./stockroomZoneAnnotations";
import type { StockroomZone } from "@/types/stockroomZones";

describe("stockroomZoneAnnotations", () => {
  it("collects unique valid zone ids from nested results in stable order", () => {
    const first = "9415eead-aa2a-443d-96d2-25471c04b892";
    const second = "0415EEAD-AA2A-443D-96D2-25471C04B892";
    const data = [
      { zones: [{ zoneId: first }, { zoneId: second }] },
      { zoneId: first },
    ];

    expect(collectZoneIds(data)).toEqual([second.toLowerCase(), first]);
  });

  it("ignores malformed, non-string, and similarly named values", () => {
    expect(
      collectZoneIds({
        zoneId: "not-a-guid",
        previousZoneId: "0415eead-aa2a-443d-96d2-25471c04b892",
        nested: { zoneId: 123 },
      }),
    ).toEqual([]);
  });

  it("builds display labels and normalizes ids", () => {
    const zone = {
      Id: "0415EEAD-AA2A-443D-96D2-25471C04B892",
      ZoneName: "Future Promo",
      TpcGroup: "Ambient",
    } as StockroomZone;

    expect(buildZoneLabels([zone]).get(zone.Id.toLowerCase())).toBe(
      "Future Promo (Ambient)",
    );
  });

  it("splits ids into bounded batches", () => {
    const ids = Array.from({ length: 31 }, (_, index) => String(index));
    expect(batchZoneIds(ids).map((batch) => batch.length)).toEqual([14, 14, 3]);
  });
});
