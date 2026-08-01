import { describe, expect, it } from "vitest";
import { extractDocumentFields } from "./queryFields";

describe("extractDocumentFields", () => {
  it("returns an empty array for no items", () => {
    expect(extractDocumentFields([])).toEqual([]);
  });

  it("filters out Cosmos system properties but keeps id", () => {
    const items = [
      {
        id: "1",
        name: "Widget",
        _rid: "abc",
        _self: "dbs/...",
        _etag: '"0000"',
        _attachments: "attachments/",
        _ts: 1_700_000_000,
      },
    ];

    expect(extractDocumentFields(items)).toEqual(["id", "name"]);
  });

  it("unions keys across documents and sorts them", () => {
    const items = [
      { id: "1", price: 10 },
      { id: "2", category: "tools" },
      { id: "3", price: 20, category: "tools" },
    ];

    expect(extractDocumentFields(items)).toEqual(["category", "id", "price"]);
  });

  it("de-duplicates repeated keys", () => {
    const items = [{ name: "a" }, { name: "b" }, { name: "c" }];

    expect(extractDocumentFields(items)).toEqual(["name"]);
  });

  it("ignores primitives, arrays, and null entries", () => {
    const items = [42, "string", null, undefined, ["a", "b"], { field: true }];

    expect(extractDocumentFields(items)).toEqual(["field"]);
  });
});
