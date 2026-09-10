import { describe, expect, it } from "vitest";
import {
  defaultResultColumns,
  discoverResultColumns,
  getResultCellValue,
  getResultItemKey,
} from "./queryResultTable";

describe("queryResultTable", () => {
  it("discovers top-level fields in first-seen order", () => {
    expect(
      discoverResultColumns([
        { id: "1", name: "First", address: { city: "Perth" } },
        { id: "2", status: "active", name: "Second" },
      ]),
    ).toEqual(["id", "name", "address", "status"]);
  });

  it("defaults to id and the first non-id field", () => {
    expect(defaultResultColumns(["name", "id", "status"])).toEqual([
      "id",
      "name",
    ]);
    expect(defaultResultColumns(["name", "status"])).toEqual(["name"]);
    expect(defaultResultColumns(["id"])).toEqual(["id"]);
  });

  it("uses a value column for scalar and array projections", () => {
    expect(discoverResultColumns([42, "answer", [1, 2]])).toEqual(["value"]);
    expect(getResultCellValue([1, 2], "value")).toEqual([1, 2]);
  });

  it("returns undefined for fields missing from a row", () => {
    expect(getResultCellValue({ id: "1" }, "name")).toBeUndefined();
  });

  it("keys result items by their document id when present", () => {
    expect(getResultItemKey({ id: "abc" }, 0)).toBe("id:abc");
    expect(getResultItemKey({ id: 42 }, 0)).toBe("id:42");
  });

  it("falls back to the row index when there is no usable id", () => {
    expect(getResultItemKey({ name: "no id" }, 3)).toBe("idx:3");
    expect(getResultItemKey(42, 1)).toBe("idx:1");
    expect(getResultItemKey("scalar", 2)).toBe("idx:2");
  });
});
