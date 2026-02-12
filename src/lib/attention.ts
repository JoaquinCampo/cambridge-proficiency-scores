export type AttentionReason =
  | "regressing"
  | "below_pass"
  | "inactive"
  | "incomplete";

export type AttentionFlag = {
  reason: AttentionReason;
  detail: string;
};

/**
 * Determine if a student needs attention based on their score history.
 *
 * @param latest   - The student's most recent enriched score
 * @param previous - The student's second most recent enriched score (if any)
 * @param allStudentScores - All of this student's scores (most recent first)
 * @param mostRecentOrgDate - The most recent exam date across the entire org
 */
export function determineAttention(
  latest: { overall: number; included: number; examDate: Date },
  previous: { overall: number } | undefined,
  allStudentScores: { overall: number; included: number; examDate: Date }[],
  mostRecentOrgDate: Date,
): AttentionFlag | null {
  const delta = previous ? latest.overall - previous.overall : null;

  // Regressing: dropped 10+ points between exams
  if (delta !== null && delta <= -10) {
    return {
      reason: "regressing",
      detail: `Latest: ${latest.overall} — dropped ${Math.abs(delta)} pts`,
    };
  }

  // Below pass: under 200 (C2 pass threshold) with at least 2 exams both under 200
  if (
    latest.overall < 200 &&
    latest.overall > 0 &&
    allStudentScores.length >= 2 &&
    allStudentScores.slice(0, 2).every((sc) => sc.overall < 200)
  ) {
    return {
      reason: "below_pass",
      detail: `Latest: ${latest.overall} — below C2 pass mark`,
    };
  }

  // Inactive: last score is 4+ weeks older than the most recent score in the org
  const inactiveThreshold = new Date(
    mostRecentOrgDate.getTime() - 28 * 24 * 60 * 60 * 1000,
  );
  const latestDate = allStudentScores[0]?.examDate;
  if (latestDate && new Date(latestDate) < inactiveThreshold) {
    return {
      reason: "inactive",
      detail: "No scores logged in 4+ weeks",
    };
  }

  // Incomplete: last 2 exams both have fewer than 3 skills
  if (
    allStudentScores.length >= 2 &&
    allStudentScores.slice(0, 2).every((sc) => sc.included < 3)
  ) {
    return {
      reason: "incomplete",
      detail: `Only ${latest.included} of 5 skills in recent exams`,
    };
  }

  return null;
}

export const REASON_ORDER: Record<AttentionReason, number> = {
  regressing: 0,
  below_pass: 1,
  inactive: 2,
  incomplete: 3,
};

export const REASON_CONFIG: Record<
  AttentionReason,
  { label: string; bg: string; text: string }
> = {
  regressing: {
    label: "Regressing",
    bg: "rgba(220,38,38,0.08)",
    text: "var(--destructive)",
  },
  below_pass: {
    label: "Below Pass",
    bg: "rgba(148,163,184,0.1)",
    text: "var(--band-below-c1)",
  },
  inactive: {
    label: "Inactive 4w",
    bg: "rgba(217,119,6,0.1)",
    text: "var(--band-c1)",
  },
  incomplete: {
    label: "Incomplete",
    bg: "rgba(124,58,237,0.08)",
    text: "var(--band-grade-c)",
  },
};
