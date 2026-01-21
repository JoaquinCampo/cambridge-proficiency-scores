import {
  C2_COMPONENTS,
  type ComponentKey,
  calculateOverallScore,
  estimateScaleScore,
  getOverallBand,
} from "./scoring";

type CandidateInfo = {
  firstName: string;
  lastName: string;
  group: string;
  institution: string;
};

type RawScoreInput = Partial<Record<ComponentKey, number>>;

type ResultsEmailInput = {
  candidate: CandidateInfo;
  rawScores: RawScoreInput;
  submittedAt?: Date;
};

export type ResultsEmailSummary = {
  subject: string;
  text: string;
  html: string;
  csvContent: string;
  csvFilename: string;
  scaleScores: Partial<Record<ComponentKey, number>>;
  overall: ReturnType<typeof calculateOverallScore>;
  gradeLabel: string;
};

const COMPONENT_ORDER: ComponentKey[] = [
  "reading",
  "useOfEnglish",
  "writing",
  "listening",
  "speaking",
];

const formatCsvValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

const buildCsv = (
  candidate: CandidateInfo,
  rawScores: RawScoreInput,
  scaleScores: Partial<Record<ComponentKey, number>>,
  overall: ReturnType<typeof calculateOverallScore>,
  gradeLabel: string,
  submittedAt: Date,
) => {
  const header = [
    "Date",
    "First Name",
    "Last Name",
    "Group",
    "Institution",
    "Reading Raw",
    "Reading Scale",
    "Use of English Raw",
    "Use of English Scale",
    "Writing Raw",
    "Writing Scale",
    "Listening Raw",
    "Listening Scale",
    "Speaking Raw",
    "Speaking Scale",
    "Overall",
    "Grade",
  ];

  const row = [
    submittedAt.toISOString(),
    candidate.firstName,
    candidate.lastName,
    candidate.group,
    candidate.institution,
    rawScores.reading ?? "",
    scaleScores.reading ?? "",
    rawScores.useOfEnglish ?? "",
    scaleScores.useOfEnglish ?? "",
    rawScores.writing ?? "",
    scaleScores.writing ?? "",
    rawScores.listening ?? "",
    scaleScores.listening ?? "",
    rawScores.speaking ?? "",
    scaleScores.speaking ?? "",
    overall.overall || "",
    gradeLabel,
  ];

  const headerLine = header.map(formatCsvValue).join(",");
  const rowLine = row.map(formatCsvValue).join(",");

  return `${headerLine}\n${rowLine}`;
};

const buildHtml = (
  candidate: CandidateInfo,
  rawScores: RawScoreInput,
  scaleScores: Partial<Record<ComponentKey, number>>,
  overall: ReturnType<typeof calculateOverallScore>,
  gradeLabel: string,
  submittedAt: Date,
) => {
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const componentRows = COMPONENT_ORDER.map((key) => {
    const label = C2_COMPONENTS[key].label;
    const raw = rawScores[key] ?? "—";
    const scale = scaleScores[key] ?? "—";
    return `
      <tr>
        <td style="padding:8px 12px;border:1px solid #eadfce;">${label}</td>
        <td style="padding:8px 12px;border:1px solid #eadfce;">${raw}</td>
        <td style="padding:8px 12px;border:1px solid #eadfce;">${scale}</td>
      </tr>
    `;
  }).join("");

  return `
  <div style="font-family:Arial, sans-serif; color:#1f1b16;">
    <h2 style="margin:0 0 8px;">C2 Proficiency Mock Results</h2>
    <p style="margin:0 0 16px;">${fullName || "Candidate"} · ${submittedAt.toISOString()}</p>
    <p style="margin:0 0 16px;">Overall: <strong>${overall.overall || "—"}</strong> (${gradeLabel})</p>
    <table style="border-collapse:collapse;width:100%;max-width:520px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;border:1px solid #eadfce;background:#f6efe3;">Paper</th>
          <th style="text-align:left;padding:8px 12px;border:1px solid #eadfce;background:#f6efe3;">Raw</th>
          <th style="text-align:left;padding:8px 12px;border:1px solid #eadfce;background:#f6efe3;">Scale</th>
        </tr>
      </thead>
      <tbody>
        ${componentRows}
      </tbody>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#5a5146;">CSV attached.</p>
  </div>
  `;
};

const buildText = (
  candidate: CandidateInfo,
  overall: ReturnType<typeof calculateOverallScore>,
  gradeLabel: string,
  submittedAt: Date,
) => {
  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  return `C2 Proficiency Mock Results\nCandidate: ${fullName || "Candidate"}\nDate: ${submittedAt.toISOString()}\nOverall: ${overall.overall || "—"} (${gradeLabel})\nCSV attached.`;
};

export const buildResultsEmail = (
  input: ResultsEmailInput,
): ResultsEmailSummary => {
  const submittedAt = input.submittedAt ?? new Date();
  const scaleScores: Partial<Record<ComponentKey, number>> = {};

  COMPONENT_ORDER.forEach((key) => {
    const rawValue = input.rawScores[key];
    if (typeof rawValue === "number") {
      scaleScores[key] = estimateScaleScore(key, rawValue);
    }
  });

  const overall = calculateOverallScore(scaleScores);
  const gradeLabel = getOverallBand(overall.overall).label;
  const fullName = `${input.candidate.firstName} ${input.candidate.lastName}`.trim();
  const subjectBase = fullName || "Candidate";
  const subject = `C2 Mock Results · ${subjectBase} · ${overall.overall || "—"}`;

  const csvContent = buildCsv(
    input.candidate,
    input.rawScores,
    scaleScores,
    overall,
    gradeLabel,
    submittedAt,
  );
  const csvFilename = `c2-results-${submittedAt
    .toISOString()
    .replace(/[:]/g, "-")}.csv`;
  const html = buildHtml(
    input.candidate,
    input.rawScores,
    scaleScores,
    overall,
    gradeLabel,
    submittedAt,
  );
  const text = buildText(input.candidate, overall, gradeLabel, submittedAt);

  return {
    subject,
    text,
    html,
    csvContent,
    csvFilename,
    scaleScores,
    overall,
    gradeLabel,
  };
};
