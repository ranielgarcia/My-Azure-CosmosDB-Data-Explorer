import { describe, expect, it } from "vitest";
import { isMutatingQuery } from "./readOnlyGuard";

describe("isMutatingQuery", () => {
  it("rejects statements that start with a mutating keyword", () => {
    expect(isMutatingQuery("DELETE FROM c")).toBe(true);
    expect(isMutatingQuery("insert into c values (1)")).toBe(true);
    expect(isMutatingQuery("  UPSERT c")).toBe(true);
    expect(isMutatingQuery("REPLACE c")).toBe(true);
    expect(isMutatingQuery("UPDATE c SET c.x = 1")).toBe(true);
    expect(isMutatingQuery("MERGE c")).toBe(true);
  });

  it("rejects mutating keywords hidden behind leading comments", () => {
    expect(isMutatingQuery("-- sneaky\nDELETE FROM c")).toBe(true);
    expect(isMutatingQuery("/* block */ DELETE FROM c")).toBe(true);
    expect(isMutatingQuery("\n\t/* a */  -- b\n  INSERT x")).toBe(true);
  });

  it("allows legitimate SELECTs that merely mention the keywords", () => {
    expect(isMutatingQuery("SELECT * FROM c")).toBe(false);
    expect(isMutatingQuery("SELECT * FROM c WHERE c.status = 'DELETED'")).toBe(
      false,
    );
    expect(isMutatingQuery("SELECT c.replaceCount FROM c")).toBe(false);
    expect(
      isMutatingQuery("SELECT * FROM c WHERE CONTAINS(c.note, 'insert coin')"),
    ).toBe(false);
    expect(isMutatingQuery("SELECT * FROM c JOIN d IN c.upsertHistory")).toBe(
      false,
    );
  });

  it("does not treat keyword prefixes of longer words as mutating", () => {
    expect(isMutatingQuery("DELETED FROM c")).toBe(false);
    expect(isMutatingQuery("INSERTVALUE c")).toBe(false);
  });
});
