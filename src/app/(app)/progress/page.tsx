"use client";

import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { OverallChart } from "~/components/overall-chart";
import { SkillProgressChart } from "~/components/skill-progress-chart";
import { ScaleReferenceBar } from "~/components/scale-reference-bar";
import type { ComponentKey } from "~/lib/scoring";

export default function ProgressPage() {
  const { data: scores, isLoading } = api.score.progress.useQuery();

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Progress"
          description="Track your Cambridge C2 Proficiency score trends"
        />
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <>
        <PageHeader
          title="Progress"
          description="Track your Cambridge C2 Proficiency score trends"
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <span className="text-base font-semibold text-[var(--foreground)]">
            No data yet
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            Log some exam scores to see your progress charts.
          </span>
        </div>
      </>
    );
  }

  const overallData = scores.map((s) => ({
    date: new Date(s.examDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overall: s.overall,
  }));

  const skillData = scores.map((s) => ({
    date: new Date(s.examDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    ...Object.fromEntries(
      (
        ["reading", "useOfEnglish", "writing", "listening", "speaking"] as ComponentKey[]
      ).map((key) => [key, s.scaleScores[key] ?? undefined]),
    ),
  }));

  return (
    <>
      <PageHeader
        title="Progress"
        description="Track your Cambridge C2 Proficiency score trends"
      />

      <div className="flex flex-col gap-6">
        <OverallChart data={overallData} />
        <SkillProgressChart data={skillData} />
        <ScaleReferenceBar />
      </div>
    </>
  );
}
