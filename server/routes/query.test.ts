import type { FeedOptions } from "@azure/cosmos";
import { describe, expect, it, vi } from "vitest";
import { fillQueryPage } from "./query";

interface TestPage {
  resources: unknown[];
  requestCharge: number;
  hasMoreResults: boolean;
  continuationToken?: string;
}

function page(
  resources: unknown[],
  requestCharge: number,
  continuationToken?: string,
): TestPage {
  return {
    resources,
    requestCharge,
    hasMoreResults: continuationToken !== undefined,
    continuationToken,
  };
}

describe("fillQueryPage", () => {
  it("continues through an empty page to return matching items", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValueOnce(page([], 2.5, "token-1"))
      .mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], 1.5));

    const result = await fillQueryPage(100, undefined, fetchPage);

    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      requestCharge: 4,
      continuationToken: null,
    });
    expect(fetchPage).toHaveBeenNthCalledWith(1, { maxItemCount: 100 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      maxItemCount: 100,
      continuationToken: "token-1",
    });
  });

  it("reduces each request to the remaining response capacity", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValueOnce(page([{ id: 1 }, { id: 2 }], 1, "token-1"))
      .mockResolvedValueOnce(page([{ id: 3 }], 2, "token-2"));

    const result = await fillQueryPage(3, undefined, fetchPage);

    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      requestCharge: 3,
      continuationToken: "token-2",
    });
    expect(fetchPage).toHaveBeenNthCalledWith(1, { maxItemCount: 3 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      maxItemCount: 1,
      continuationToken: "token-1",
    });
  });

  it("starts from a supplied continuation token", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValue(page([{ id: 2 }], 1));

    await fillQueryPage(10, "starting-token", fetchPage);

    expect(fetchPage).toHaveBeenCalledWith({
      maxItemCount: 10,
      continuationToken: "starting-token",
    });
  });

  it("rejects a non-advancing continuation token", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValue(page([], 1, "same-token"));

    await expect(fillQueryPage(10, "same-token", fetchPage)).rejects.toThrow(
      "non-advancing continuation token",
    );
  });

  it("stops when more results are reported without a usable token", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValue({
        resources: [{ id: 1 }],
        requestCharge: 2,
        hasMoreResults: true,
      });

    const result = await fillQueryPage(10, undefined, fetchPage);

    expect(result).toEqual({
      items: [{ id: 1 }],
      requestCharge: 2,
      continuationToken: null,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("returns a complete oversized page and preserves its continuation token", async () => {
    const fetchPage = vi
      .fn<(options: FeedOptions) => Promise<TestPage>>()
      .mockResolvedValue(page([{ id: 1 }, { id: 2 }], 1, "next-token"));

    const result = await fillQueryPage(1, undefined, fetchPage);

    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      requestCharge: 1,
      continuationToken: "next-token",
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
