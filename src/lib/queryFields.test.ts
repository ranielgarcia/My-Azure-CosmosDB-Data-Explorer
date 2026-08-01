import { describe, expect, it } from "vitest";
import { childFieldNames, extractDocumentFields } from "./queryFields";

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

  it("flattens nested objects into dotted paths", () => {
    const items = [
      {
        id: "1",
        address: { city: "Perth", geo: { lat: -31.9, lng: 115.8 } },
      },
    ];

    expect(extractDocumentFields(items)).toEqual([
      "address",
      "address.city",
      "address.geo",
      "address.geo.lat",
      "address.geo.lng",
      "id",
    ]);
  });

  it("treats arrays as leaves and does not recurse into them", () => {
    const items = [{ tags: [{ name: "a" }], id: "1" }];

    expect(extractDocumentFields(items)).toEqual(["id", "tags"]);
  });

  it("only filters system properties at the document root", () => {
    const items = [{ id: "1", meta: { _ts: 5, label: "x" } }];

    expect(extractDocumentFields(items)).toEqual([
      "id",
      "meta",
      "meta._ts",
      "meta.label",
    ]);
  });
});

describe("childFieldNames", () => {
  const paths = [
    "address",
    "address.city",
    "address.geo",
    "address.geo.lat",
    "id",
    "name",
  ];

  it("returns top-level fields for an empty parent path", () => {
    expect(childFieldNames(paths, "").sort()).toEqual([
      "address",
      "id",
      "name",
    ]);
  });

  it("returns immediate children of a nested parent", () => {
    expect(childFieldNames(paths, "address").sort()).toEqual(["city", "geo"]);
  });

  it("returns deeper immediate children only", () => {
    expect(childFieldNames(paths, "address.geo")).toEqual(["lat"]);
  });

  it("returns nothing for an unknown parent", () => {
    expect(childFieldNames(paths, "missing")).toEqual([]);
  });

  it("returns nothing when there are no fields", () => {
    expect(childFieldNames([], "")).toEqual([]);
  });
});
