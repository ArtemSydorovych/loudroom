import { describe, expect, it } from "vitest";
import { generateJoinCode, isJoinCodeShape } from "./join-code.js";

describe("generateJoinCode", () => {
  it("returns a 6-character code by default", () => {
    expect(generateJoinCode()).toHaveLength(6);
  });

  it("respects an explicit length", () => {
    expect(generateJoinCode(8)).toHaveLength(8);
  });

  it("uses only the unambiguous alphabet (no 0/O/1/I)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});

describe("isJoinCodeShape", () => {
  it("accepts a freshly generated code", () => {
    expect(isJoinCodeShape(generateJoinCode())).toBe(true);
  });

  it("rejects codes with the wrong length", () => {
    expect(isJoinCodeShape("ABCDE")).toBe(false);
    expect(isJoinCodeShape("ABCDEFG")).toBe(false);
  });

  it("rejects codes containing the excluded characters", () => {
    expect(isJoinCodeShape("ABCDE0")).toBe(false);
    expect(isJoinCodeShape("ABCDEO")).toBe(false);
    expect(isJoinCodeShape("ABCDE1")).toBe(false);
    expect(isJoinCodeShape("ABCDEI")).toBe(false);
  });

  it("rejects lowercase input", () => {
    expect(isJoinCodeShape("abcdef")).toBe(false);
  });
});
