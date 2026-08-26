import { describe, expect, it } from "vitest";
import { getAllowedOrigins } from "./cors";

describe("getAllowedOrigins", () => {
  it("allows the trusted Capacitor Android origins", () => {
    const origins = getAllowedOrigins();

    expect(origins).toContain("http://localhost");
    expect(origins).toContain("capacitor://localhost");
    expect(origins).toContain("https://abdelatizarzori3-sys.github.io");
  });

  it("includes explicitly configured production origins", () => {
    const origins = getAllowedOrigins("https://app.example.test, https://preview.example.test");

    expect(origins.has("https://app.example.test")).toBe(true);
    expect(origins.has("https://preview.example.test")).toBe(true);
  });
});
