"use client";

import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  C2_COMPONENTS,
  type ComponentKey,
  calculateOverallScore,
  estimateScaleScore,
  getOverallBand,
} from "~/lib/scoring";
import { cn } from "~/lib/utils";

type CandidateFields = {
  firstName: string;
  lastName: string;
  group: string;
  institution: string;
};

type RawScoreFields = Record<ComponentKey, string>;

type ResultsSnapshot = {
  scaleScores: Partial<Record<ComponentKey, number>>;
  overall: ReturnType<typeof calculateOverallScore> | null;
};

const emptyCandidate: CandidateFields = {
  firstName: "",
  lastName: "",
  group: "",
  institution: "",
};

const emptyScores: RawScoreFields = {
  reading: "",
  useOfEnglish: "",
  writing: "",
  listening: "",
  speaking: "",
};

const bandStyles: Record<string, { variant: "accent" | "muted" | "success" | "warning" }> = {
  "Grade A": { variant: "accent" },
  "Grade B": { variant: "warning" },
  "Grade C": { variant: "success" },
  "Level C1": { variant: "muted" },
  "No certificate": { variant: "muted" },
  "Not reported": { variant: "muted" },
};

const componentOrder: ComponentKey[] = [
  "reading",
  "useOfEnglish",
  "writing",
  "listening",
  "speaking",
];

const formatCandidateName = (candidate: CandidateFields) => {
  const name = `${candidate.firstName} ${candidate.lastName}`.trim();
  if (!name) {
    return "Candidate";
  }
  return name;
};

const parseScoreValue = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getScoreRangeLabel = (key: ComponentKey) => {
  const max = C2_COMPONENTS[key].maxRaw;
  return `0–${max}`;
};

const getComponentBandLabel = (scaleScore: number) => {
  const band = getOverallBand(scaleScore);
  return band.label;
};

export const ScoreApp = () => {
  const [candidate, setCandidate] = useState<CandidateFields>(emptyCandidate);
  const [rawScores, setRawScores] = useState<RawScoreFields>(emptyScores);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsSnapshot | null>(null);

  const validation = useMemo(() => {
    const errors: Partial<Record<ComponentKey, string>> = {};
    componentOrder.forEach((key) => {
      const rawValue = parseScoreValue(rawScores[key]);
      if (rawScores[key].trim() === "") {
        return;
      }
      if (rawValue === null) {
        errors[key] = "Enter a valid number.";
        return;
      }
      const max = C2_COMPONENTS[key].maxRaw;
      if (rawValue < 0 || rawValue > max) {
        errors[key] = `Must be between 0 and ${max}.`;
        return;
      }
      if (key !== "speaking" && !Number.isInteger(rawValue)) {
        errors[key] = "Whole marks only.";
      }
      if (key === "speaking" && rawValue % 0.5 !== 0) {
        errors[key] = "Speaking allows halves (e.g. 37.5).";
      }
    });
    return errors;
  }, [rawScores]);

  const hasAnyScore = componentOrder.some((key) => rawScores[key].trim() !== "");
  const hasValidationErrors = Object.keys(validation).length > 0;

  const handleCandidateChange = (field: keyof CandidateFields, value: string) => {
    setCandidate((prev) => ({ ...prev, [field]: value }));
  };

  const handleScoreChange = (field: ComponentKey, value: string) => {
    setRawScores((prev) => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setCandidate(emptyCandidate);
    setRawScores(emptyScores);
    setResults(null);
    setConfirmError(null);
  };

  const openConfirmDialog = () => {
    setConfirmError(null);
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!hasAnyScore) {
      setConfirmError("Enter at least one paper score to continue.");
      return;
    }
    if (hasValidationErrors) {
      setConfirmError("Fix the highlighted scores before calculating.");
      return;
    }

    const scaleScores: Partial<Record<ComponentKey, number>> = {};
    componentOrder.forEach((key) => {
      const rawValue = parseScoreValue(rawScores[key]);
      if (rawValue !== null) {
        scaleScores[key] = estimateScaleScore(key, rawValue);
      }
    });

    const overall = calculateOverallScore(scaleScores);
    setResults({ scaleScores, overall });
    setDialogOpen(false);
  };

  const overallBand = results?.overall?.overall
    ? getOverallBand(results.overall.overall)
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(120deg,#f6efe3_0%,#f1e6d2_45%,#f6efe3_100%)]">
      <div className="pointer-events-none absolute -left-40 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,#ffead6_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute right-[-10rem] top-[-6rem] h-96 w-96 rounded-full bg-[radial-gradient(circle,#d6eef2_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,#f4d7de_0%,transparent_70%)]" />

      <section className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-center text-lg font-bold leading-10 text-white shadow-[0_10px_20px_rgba(139,30,63,0.28)]">
              C2
            </span>
            <div className="text-sm uppercase tracking-[0.3em] text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
              Proficiency Score Studio
            </div>
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-[var(--ink)] sm:text-5xl">
            Turn mock marks into Cambridge scale insight.
          </h1>
          <p className="max-w-2xl text-base text-[color-mix(in_oklab,var(--ink)_70%,transparent)]">
            Enter raw marks from your practice paper, confirm them, and get an
            estimated Cambridge English Scale result with grade bands, visual
            scale cues, and a printable breakdown.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-[color-mix(in_oklab,var(--ink)_12%,transparent)]">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                Candidate & Scores
              </CardTitle>
              <CardDescription>
                Leave any paper blank if it was not taken.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Ana"
                    value={candidate.firstName}
                    onChange={(event) =>
                      handleCandidateChange("firstName", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Martinez"
                    value={candidate.lastName}
                    onChange={(event) =>
                      handleCandidateChange("lastName", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Group / cohort</Label>
                  <Input
                    id="group"
                    placeholder="C2 Morning"
                    value={candidate.group}
                    onChange={(event) =>
                      handleCandidateChange("group", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    placeholder="Cambridge Prep Academy"
                    value={candidate.institution}
                    onChange={(event) =>
                      handleCandidateChange("institution", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">Paper scores</h3>
                  <Badge variant="muted">Raw marks</Badge>
                </div>
                <div className="grid gap-4">
                  {componentOrder.map((key) => {
                    const details = C2_COMPONENTS[key];
                    const error = validation[key];
                    return (
                      <div
                        key={key}
                        className="grid items-center gap-3 rounded-2xl border border-transparent bg-white/60 p-4 md:grid-cols-[1.1fr_0.7fr_0.6fr]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {details.label}
                          </p>
                          <p className="text-xs text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                            Max {details.maxRaw} · {getScoreRangeLabel(key)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Input
                            inputMode="decimal"
                            type="number"
                            step={key === "speaking" ? "0.5" : "1"}
                            min={0}
                            max={details.maxRaw}
                            value={rawScores[key]}
                            onChange={(event) =>
                              handleScoreChange(key, event.target.value)
                            }
                            className={cn(
                              error
                                ? "border-[var(--accent)] focus-visible:ring-[var(--accent)]"
                                : undefined,
                            )}
                          />
                          {error ? (
                            <p className="text-xs text-[var(--accent)]">
                              {error}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-xs text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                          {key === "writing"
                            ? "2 tasks × 20"
                            : key === "speaking"
                              ? "75 total"
                              : "1 point each"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                Cambridge scale conversions are estimates based on official
                practice-test anchor points.
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={resetAll}>
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={openConfirmDialog}
                  disabled={!hasAnyScore}
                >
                  Calculate scores
                </Button>
              </div>
            </CardFooter>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="relative overflow-hidden border-[color-mix(in_oklab,var(--ink)_12%,transparent)]">
              <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,#f7dcc8_0%,transparent_70%)]" />
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  Overall score
                </CardTitle>
                <CardDescription>
                  Average of available papers (Scale score).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results ? (
                  <>
                    <div className="flex items-end gap-4">
                      <div className="text-5xl font-semibold">
                        {results.overall?.overall ?? "—"}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-[color-mix(in_oklab,var(--ink)_70%,transparent)]">
                          {formatCandidateName(candidate)}
                        </p>
                        <p className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_oklab,var(--ink)_50%,transparent)]">
                          {results.overall?.included ?? 0}/5 papers
                        </p>
                      </div>
                    </div>
                    {overallBand ? (
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            bandStyles[overallBand.label]?.variant ?? "muted"
                          }
                        >
                          {overallBand.label}
                        </Badge>
                        <span className="text-sm text-[color-mix(in_oklab,var(--ink)_70%,transparent)]">
                          CEFR {overallBand.cefr}
                        </span>
                      </div>
                    ) : null}
                    {!results.overall?.isComplete ? (
                      <p className="text-xs text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                        Partial overall score — add the remaining papers for the
                        official Cambridge calculation.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--ink)_20%,transparent)] bg-white/60 p-6 text-sm text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                    Your overall score will appear here after confirmation.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[color-mix(in_oklab,var(--ink)_12%,transparent)]">
              <CardHeader>
                <CardTitle className="font-display text-2xl">
                  Component breakdown
                </CardTitle>
                <CardDescription>
                  Cambridge English Scale estimates per paper.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {componentOrder.map((key) => {
                  const rawValue = parseScoreValue(rawScores[key]);
                  const scaleScore = results?.scaleScores[key];
                  const percent = scaleScore
                    ? ((scaleScore - 160) / 70) * 100
                    : 0;
                  const bandLabel =
                    scaleScore !== undefined
                      ? getComponentBandLabel(scaleScore)
                      : null;
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-[color-mix(in_oklab,var(--ink)_10%,transparent)] bg-white/60 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {C2_COMPONENTS[key].label}
                          </p>
                          <p className="text-xs text-[color-mix(in_oklab,var(--ink)_60%,transparent)]">
                            Raw {rawValue ?? "—"} / {C2_COMPONENTS[key].maxRaw}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">
                            {scaleScore ?? "—"}
                          </p>
                          {bandLabel ? (
                            <Badge
                              variant={
                                bandStyles[bandLabel]?.variant ?? "muted"
                              }
                              className="mt-2"
                            >
                              {bandLabel}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="h-2 rounded-full bg-[color-mix(in_oklab,var(--ink)_10%,transparent)]">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))]"
                            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--ink)_50%,transparent)]">
                          <span>162</span>
                          <span>180</span>
                          <span>200</span>
                          <span>220</span>
                          <span>230</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Confirm the candidate details
            </DialogTitle>
            <DialogDescription>
              Check the raw marks carefully. Once confirmed, the app will
              estimate the Cambridge scale scores.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[color-mix(in_oklab,var(--ink)_12%,transparent)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_oklab,var(--ink)_50%,transparent)]">
                Candidate
              </p>
              <p className="mt-2 text-lg font-semibold">
                {formatCandidateName(candidate)}
              </p>
              <p className="text-sm text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">
                {candidate.group || "Group not specified"}
              </p>
              <p className="text-sm text-[color-mix(in_oklab,var(--ink)_65%,transparent)]">
                {candidate.institution || "Institution not specified"}
              </p>
            </div>
            <div className="rounded-2xl border border-[color-mix(in_oklab,var(--ink)_12%,transparent)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[color-mix(in_oklab,var(--ink)_50%,transparent)]">
                Papers
              </p>
              <div className="mt-3 space-y-2 text-sm">
                {componentOrder.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span>{C2_COMPONENTS[key].label}</span>
                    <span className="font-semibold">
                      {rawScores[key].trim() || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {confirmError ? (
            <p className="mt-4 text-sm text-[var(--accent)]">{confirmError}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Edit
            </Button>
            <Button onClick={handleConfirm}>Confirm & calculate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};
