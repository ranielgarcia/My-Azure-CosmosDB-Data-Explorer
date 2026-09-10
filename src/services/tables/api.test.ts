import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchStockroomZonesByIds,
  fetchStockroomZonesByPartitionKeys,
} from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  } as Response);
}

describe("StockroomZones table API", () => {
  it("posts partition keys and unwraps items", async () => {
    const items = [{ Id: "zone-1" }];
    const fetchMock = mockFetch({ items, count: 1 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStockroomZonesByPartitionKeys(["0458"])).resolves.toEqual(
      items,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tables/stockroom-zones/by-partition-keys",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ partitionKeys: ["0458"] }),
      }),
    );
  });

  it("posts ids, forwards cancellation, and unwraps items", async () => {
    const fetchMock = mockFetch({ items: [], count: 0 });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await fetchStockroomZonesByIds(["zone-1"], controller.signal);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tables/stockroom-zones/by-ids",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["zone-1"] }),
        signal: controller.signal,
      }),
    );
  });
});
