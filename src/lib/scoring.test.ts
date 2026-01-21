import { describe, expect, it } from "vitest";

import {
  calculateOverallScore,
  estimateScaleScore,
  getOverallBand,
} from "./scoring";

describe("estimateScaleScore", () => {
  it("returns anchor values exactly for reading", () => {
    expect(estimateScaleScore("reading", 36)).toBe(220);
    expect(estimateScaleScore("reading", 28)).toBe(200);
    expect(estimateScaleScore("reading", 22)).toBe(180);
    expect(estimateScaleScore("reading", 14)).toBe(162);
  });

  it("interpolates between anchors and rounds to nearest integer", () => {
    expect(estimateScaleScore("reading", 32)).toBe(210);
  });

  it("clamps below minimum to 162", () => {
    expect(estimateScaleScore("reading", 10)).toBe(162);
  });

  it("clamps above maximum to 230", () => {
    expect(estimateScaleScore("reading", 44)).toBe(230);
  });
});

describe("calculateOverallScore", () => {
  it("averages scale scores and rounds", () => {
    const result = calculateOverallScore({
      reading: 168,
      useOfEnglish: 154,
      writing: 171,
      listening: 162,
      speaking: 169,
    });

    expect(result.overall).toBe(165);
    expect(result.included).toBe(5);
    expect(result.isComplete).toBe(true);
  });

  it("handles partial inputs", () => {
    const result = calculateOverallScore({
      reading: 200,
      listening: 180,
    });

    expect(result.overall).toBe(190);
    expect(result.included).toBe(2);
    expect(result.isComplete).toBe(false);
  });
});

describe("getOverallBand", () => {
  it("maps overall scores to grade bands", () => {
    expect(getOverallBand(220).label).toBe("Grade A");
    expect(getOverallBand(213).label).toBe("Grade B");
    expect(getOverallBand(200).label).toBe("Grade C");
    expect(getOverallBand(180).label).toBe("Level C1");
    expect(getOverallBand(170).label).toBe("No certificate");
    expect(getOverallBand(150).label).toBe("Not reported");
  });
});
