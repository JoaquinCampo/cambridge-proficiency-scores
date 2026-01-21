export type ComponentKey =
  | "reading"
  | "useOfEnglish"
  | "writing"
  | "listening"
  | "speaking";

export type ComponentDefinition = {
  label: string;
  maxRaw: number;
  anchors: { raw: number; scale: number }[];
};

export const C2_COMPONENTS: Record<ComponentKey, ComponentDefinition> = {
  reading: {
    label: "Reading",
    maxRaw: 44,
    anchors: [
      { raw: 36, scale: 220 },
      { raw: 28, scale: 200 },
      { raw: 22, scale: 180 },
      { raw: 14, scale: 162 },
    ],
  },
  useOfEnglish: {
    label: "Use of English",
    maxRaw: 28,
    anchors: [
      { raw: 22, scale: 220 },
      { raw: 17, scale: 200 },
      { raw: 13, scale: 180 },
      { raw: 9, scale: 162 },
    ],
  },
  writing: {
    label: "Writing",
    maxRaw: 40,
    anchors: [
      { raw: 34, scale: 220 },
      { raw: 24, scale: 200 },
      { raw: 16, scale: 180 },
      { raw: 10, scale: 162 },
    ],
  },
  listening: {
    label: "Listening",
    maxRaw: 30,
    anchors: [
      { raw: 24, scale: 220 },
      { raw: 18, scale: 200 },
      { raw: 14, scale: 180 },
      { raw: 10, scale: 162 },
    ],
  },
  speaking: {
    label: "Speaking",
    maxRaw: 75,
    anchors: [
      { raw: 66, scale: 220 },
      { raw: 45, scale: 200 },
      { raw: 30, scale: 180 },
      { raw: 17, scale: 162 },
    ],
  },
};

const MAX_SCALE_SCORE = 230;
const MIN_REPORTED_SCORE = 162;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const round = (value: number) => Math.round(value);

const interpolate = (
  x: number,
  pointA: { raw: number; scale: number },
  pointB: { raw: number; scale: number },
) => {
  const slope = (pointB.scale - pointA.scale) / (pointB.raw - pointA.raw);
  return pointA.scale + (x - pointA.raw) * slope;
};

export const estimateScaleScore = (component: ComponentKey, raw: number) => {
  const { anchors } = C2_COMPONENTS[component];
  const ordered = [...anchors].sort((a, b) => b.raw - a.raw);
  if (ordered.length === 0) {
    return MIN_REPORTED_SCORE;
  }

  const minAnchor = ordered[ordered.length - 1];
  const topAnchor = ordered[0];
  const nextAnchor = ordered[1] ?? topAnchor;

  if (!minAnchor || !topAnchor || !nextAnchor) {
    return MIN_REPORTED_SCORE;
  }

  if (raw <= minAnchor.raw) {
    return MIN_REPORTED_SCORE;
  }

  if (raw >= topAnchor.raw) {
    const scaled = interpolate(raw, topAnchor, nextAnchor);
    return clamp(round(scaled), MIN_REPORTED_SCORE, MAX_SCALE_SCORE);
  }

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const upper = ordered[i];
    const lower = ordered[i + 1];
    if (!upper || !lower) {
      continue;
    }

    if (raw <= upper.raw && raw >= lower.raw) {
      const scaled = interpolate(raw, upper, lower);
      return clamp(round(scaled), MIN_REPORTED_SCORE, MAX_SCALE_SCORE);
    }
  }

  return MIN_REPORTED_SCORE;
};

export type ScaleScoreMap = Partial<Record<ComponentKey, number>>;

export const calculateOverallScore = (scores: ScaleScoreMap) => {
  const values = Object.values(scores).filter(
    (score): score is number => typeof score === "number",
  );

  const included = values.length;
  if (included === 0) {
    return { overall: 0, included: 0, isComplete: false };
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const overall = round(total / included);

  return { overall, included, isComplete: included === 5 };
};

export type OverallBand = {
  label: string;
  cefr: string;
  certificate: boolean;
  range: [number, number] | null;
};

export const C2_OVERALL_BANDS: OverallBand[] = [
  { label: "Grade A", cefr: "C2", certificate: true, range: [220, 230] },
  { label: "Grade B", cefr: "C2", certificate: true, range: [213, 219] },
  { label: "Grade C", cefr: "C2", certificate: true, range: [200, 212] },
  { label: "Level C1", cefr: "C1", certificate: true, range: [180, 199] },
  {
    label: "No certificate",
    cefr: "Below C1",
    certificate: false,
    range: [162, 179],
  },
];

export const getOverallBand = (overall: number): OverallBand => {
  const match = C2_OVERALL_BANDS.find((band) => {
    if (!band.range) {
      return false;
    }
    return overall >= band.range[0] && overall <= band.range[1];
  });

  return (
    match ?? {
      label: "Not reported",
      cefr: "Below 162",
      certificate: false,
      range: null,
    }
  );
};
