import { describe, expect, it } from "vitest";

import { buildResultsEmail } from "./email";

const baseCandidate = {
  firstName: "Ana",
  lastName: "Martinez",
  group: "C2 Morning",
  institution: "Cambridge Prep Academy",
};

describe("buildResultsEmail", () => {
  it("builds a csv row with all component columns", () => {
    const summary = buildResultsEmail({
      candidate: baseCandidate,
      rawScores: {
        reading: 36,
        useOfEnglish: 22,
        writing: 34,
        listening: 24,
        speaking: 66,
      },
      submittedAt: new Date("2025-01-01T00:00:00.000Z"),
    });

    const [header, row] = summary.csvContent.trim().split("\n");
    if (!header || !row) {
      throw new Error("Missing csv header or row");
    }
    expect(header).toContain("Reading Raw");
    expect(header).toContain("Reading Scale");
    expect(row).toContain("2025-01-01T00:00:00.000Z");
    expect(row).toContain("Ana");
    expect(row).toContain("Martinez");
    expect(row).toContain(",36,220");
    expect(row).toContain(",66,220");
    expect(row.endsWith(",220,Grade A")).toBe(true);
  });

  it("leaves blanks for missing papers", () => {
    const summary = buildResultsEmail({
      candidate: baseCandidate,
      rawScores: {
        reading: 22,
      },
      submittedAt: new Date("2025-02-02T12:00:00.000Z"),
    });

    const row = summary.csvContent.trim().split("\n")[1];
    if (!row) {
      throw new Error("Missing csv row");
    }
    const columns = row.split(",");

    expect(columns[0]).toBe("2025-02-02T12:00:00.000Z");
    expect(columns[5]).toBe("22");
    expect(columns[6]).toBe("180");
    expect(columns[7]).toBe("");
    expect(columns[14]).toBe("");
  });
});
