import { describe, expect, it } from "vitest";
import { toWebHeaders } from "./http.js";

describe("toWebHeaders", () => {
  it("converts simple string headers", () => {
    const h = toWebHeaders({ "content-type": "application/json", host: "localhost:3001" });
    expect(h.get("content-type")).toBe("application/json");
    expect(h.get("host")).toBe("localhost:3001");
  });

  it("appends each value when the source header is an array", () => {
    const h = toWebHeaders({ "set-cookie": ["a=1", "b=2"] });
    expect(h.get("set-cookie")).toContain("a=1");
    expect(h.get("set-cookie")).toContain("b=2");
  });

  it("skips undefined values", () => {
    const h = toWebHeaders({ "x-empty": undefined, "x-present": "yes" });
    expect(h.has("x-empty")).toBe(false);
    expect(h.get("x-present")).toBe("yes");
  });

  it("coerces non-string scalar values to strings", () => {
    const h = toWebHeaders({ "content-length": 42 as unknown as string });
    expect(h.get("content-length")).toBe("42");
  });
});
