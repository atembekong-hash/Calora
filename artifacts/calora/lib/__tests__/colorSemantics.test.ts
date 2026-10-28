import { describe, expect, it } from "vitest";
import colors from "@/constants/colors";

type HexColor = `#${string}`;

type Palette = (typeof colors)["light"] | (typeof colors)["dark"];

function luminance(color: HexColor): number {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((part) => Number.parseInt(part, 16) / 255);
  if (!channels || channels.length !== 3)
    throw new Error(`Expected a six-digit hex color, got ${color}`);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: HexColor, background: HexColor): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function expectContrast(
  palette: Palette,
  foreground: keyof Palette,
  background: keyof Palette,
  minimum: number,
) {
  expect(
    contrast(palette[foreground] as HexColor, palette[background] as HexColor),
  ).toBeGreaterThanOrEqual(minimum);
}

describe("Calora semantic color roles", () => {
  for (const [name, palette] of Object.entries({
    light: colors.light,
    dark: colors.dark,
  }) as [string, Palette][]) {
    describe(name, () => {
      it("keeps ordinary copy readable on the app and card surfaces", () => {
        expectContrast(palette, "foreground", "background", 4.5);
        expectContrast(palette, "foreground", "card", 4.5);
        expectContrast(palette, "mutedForeground", "background", 4.5);
        expectContrast(palette, "mutedForeground", "card", 4.5);
        expectContrast(palette, "mutedForeground", "muted", 4.5);
      });

      it("keeps semantic links and status copy readable on their intended surfaces", () => {
        expectContrast(palette, "link", "background", 4.5);
        expectContrast(palette, "link", "card", 4.5);
        expectContrast(palette, "accentForeground", "accent", 4.5);
        expectContrast(palette, "successForeground", "successTint", 4.5);
        expectContrast(palette, "warningForeground", "warningTint", 4.5);
        expectContrast(palette, "destructiveForeground", "destructive", 4.5);
      });

      it("keeps primary actions and important graphical controls distinct", () => {
        expectContrast(palette, "primaryForeground", "primary", 4.5);
        expectContrast(palette, "control", "background", 3);
        expectContrast(palette, "control", "card", 3);
        expectContrast(palette, "success", "card", 3);
        expectContrast(palette, "warning", "card", 3);
      });
    });
  }

  it("separates decorative fills from readable foreground roles", () => {
    for (const palette of [colors.light, colors.dark]) {
      expect(palette.mutedForeground).not.toBe(palette.muted);
      expect(palette.successForeground).not.toBe(palette.success);
      expect(palette.warningForeground).not.toBe(palette.warning);
      expect(palette.sheetHandle).not.toBe(palette.border);
    }
  });
});
