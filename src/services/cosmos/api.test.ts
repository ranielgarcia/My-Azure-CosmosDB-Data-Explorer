import { afterEach, describe, expect, it, vi } from "vitest";
import { executeQuery, fetchContainers, fetchDatabases } from "./api";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cosmos api service", () => {
  it("fetchDatabases unwraps the databases array", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { databases: [{ id: "db1" }] }));
    await expect(fetchDatabases()).resolves.toEqual([{ id: "db1" }]);
  });

  it("fetchContainers unwraps the containers array", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { containers: [{ id: "c1", partitionKeyPath: "/pk" }] }),
    );
    await expect(fetchContainers("db1")).resolves.toEqual([
      { id: "c1", partitionKeyPath: "/pk" },
    ]);
  });

  it("executeQuery returns the query result payload", async () => {
    const payload = {
      items: [{ a: 1 }],
      count: 1,
      requestCharge: 2.3,
      continuationToken: "tok",
    };
    vi.stubGlobal("fetch", mockFetch(200, payload));
    await expect(executeQuery("db1", "c1", "SELECT * FROM c")).resolves.toEqual(
      payload,
    );
  });

  it("maps a non-2xx JSON error body to a typed QueryError", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, { error: "Only read-only (SELECT) queries are allowed." }),
    );
    await expect(executeQuery("db1", "c1", "DELETE FROM c")).rejects.toEqual({
      message: "Only read-only (SELECT) queries are allowed.",
      code: 400,
    });
  });

  it("falls back to a status message when the error body has no JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no body");
        },
      } as unknown as Response),
    );

    await expect(fetchDatabases()).rejects.toEqual({
      message: "Request failed with status 500",
      code: 500,
    });
  });
});
