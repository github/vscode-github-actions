import {validateTunnelUrl} from "./tunnelUrl";

describe("validateTunnelUrl", () => {
  it("accepts a valid wss:// devtunnels URL", () => {
    const result = validateTunnelUrl("wss://abcdef-4711.uks1.devtunnels.ms/");
    expect(result).toEqual({valid: true, url: "wss://abcdef-4711.uks1.devtunnels.ms/"});
  });

  it("accepts a devtunnels URL without trailing slash", () => {
    const result = validateTunnelUrl("wss://abcdef-4711.uks1.devtunnels.ms");
    expect(result.valid).toBe(true);
  });

  it("accepts a devtunnels URL with a path", () => {
    const result = validateTunnelUrl("wss://abcdef-4711.uks1.devtunnels.ms/connect");
    expect(result.valid).toBe(true);
  });

  it("rejects ws:// (cleartext)", () => {
    const result = validateTunnelUrl("ws://abcdef-4711.uks1.devtunnels.ms/");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("wss://");
    }
  });

  it("rejects http:// scheme", () => {
    const result = validateTunnelUrl("http://abcdef-4711.uks1.devtunnels.ms/");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("wss://");
    }
  });

  it("rejects https:// scheme", () => {
    const result = validateTunnelUrl("https://abcdef-4711.uks1.devtunnels.ms/");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("wss://");
    }
  });

  it("rejects non-devtunnels host", () => {
    const result = validateTunnelUrl("wss://evil.example.com/");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("not an allowed tunnel domain");
    }
  });

  it("rejects empty string", () => {
    const result = validateTunnelUrl("");
    expect(result.valid).toBe(false);
  });

  it("rejects invalid URL format", () => {
    const result = validateTunnelUrl("not a url at all");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Invalid URL");
    }
  });

  it("rejects URL with just a scheme", () => {
    const result = validateTunnelUrl("wss://");
    expect(result.valid).toBe(false);
  });
});
