import { describe, expect, it } from "vitest";
import { svgToDataURI, svgToBase64, svgToBase64Raw } from "../data-uri";

describe("data URI encoding", () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#000"/></svg>';

  it("creates valid data URI", () => {
    const uri = svgToDataURI(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
    expect(uri.length).toBeGreaterThan(svg.length);
  });

  it("creates base64 data URI", () => {
    const uri = svgToBase64(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("creates raw base64 string", () => {
    const b64 = svgToBase64Raw(svg);
    expect(b64).not.toContain("data:");
    // Should be valid base64 characters
    expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("percent-encodes special characters", () => {
    const uri = svgToDataURI(svg);
    expect(uri).not.toContain("<svg");
    expect(uri).toContain("%3C");
  });
});
