import { describe, expect, it } from "bun:test";
import {
  DEFAULT_UNIT_PREFS,
  temperatureFromDisplay,
  temperatureToDisplay,
  volumeFromDisplay,
  volumeToDisplay,
  weightFromDisplay,
  weightToDisplay,
} from "../preferences";

describe("canonical health units", () => {
  it("round-trips pounds through canonical kilograms", () => {
    const units = { ...DEFAULT_UNIT_PREFS, weight: "lb" as const };
    expect(weightToDisplay(weightFromDisplay(137.789, units), units)).toBeCloseTo(137.789, 6);
  });

  it("round-trips Fahrenheit through canonical Celsius", () => {
    const units = { ...DEFAULT_UNIT_PREFS, temperature: "f" as const };
    expect(temperatureToDisplay(temperatureFromDisplay(98.6, units), units)).toBeCloseTo(98.6, 6);
  });

  it("round-trips fluid ounces through canonical millilitres", () => {
    const units = { ...DEFAULT_UNIT_PREFS, volume: "oz" as const };
    expect(volumeToDisplay(volumeFromDisplay(8, units), units)).toBeCloseTo(8, 6);
  });
});
