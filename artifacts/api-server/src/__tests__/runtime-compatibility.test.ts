import { describe, expect, it } from "vitest";
import { assertApiRuntimeCompatible, parseNodeVersion } from "../lib/runtime-compatibility";

describe("API runtime compatibility", () => {
  it("accepts the Railway-supported Node 22 runtime", () => {
    expect(parseNodeVersion("v22.14.0")).toEqual({ major: 22, minor: 14, patch: 0 });
    expect(() => assertApiRuntimeCompatible("v22.14.0")).not.toThrow();
    expect(() => assertApiRuntimeCompatible("v22.16.0")).not.toThrow();
  });

  it("rejects Node 20 and future unsupported majors before startup", () => {
    expect(() => assertApiRuntimeCompatible("v20.19.4")).toThrow(/requires Node/);
    expect(() => assertApiRuntimeCompatible("v24.0.0")).toThrow(/requires Node/);
  });
});
