"use client";

import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { ScoreSnapshotCard } from "~/components/score-snapshot-card";
import { ProgressDeltaCard } from "~/components/progress-delta-card";
import { SkillSpotlightCard } from "~/components/skill-spotlight-card";
import { OverallChart } from "~/components/overall-chart";
import { redirect } from "next/navigation";

export default function HomePage() {
  const { data: me, isLoading: meLoading } = api.user.me.useQuery();
  const { data: scores, isLoading: scoresLoading } =
    api.score.progress.useQuery(undefined, {
      enabled: me?.role === "student",
    });

  if (meLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  // Teachers land on the dashboard
  if (me?.role === "teacher") {
    redirect("/dashboard");
  }

  if (scoresLoading) {
    return (
      <>
        <PageHeader
          title="My Scores"
          description="Track your Cambridge C2 Proficiency exam progress"
        />
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <>
        <PageHeader
          title="My Scores"
          description="Track your Cambridge C2 Proficiency exam progress"
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <span className="text-base font-semibold text-[var(--foreground)]">
            No scores yet
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            Start by logging your first exam score.
          </span>
        </div>
      </>
    );
  }

  const latest = scores[scores.length - 1]!;
  const previous = scores.length >= 2 ? scores[scores.length - 2] : undefined;

  const chartData = scores.map((s) => ({
    date: new Date(s.examDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overall: s.overall,
  }));

  return (
    <>
      <PageHeader
        title="My Scores"
        description="Track your Cambridge C2 Proficiency exam progress"
      />

      {/* Cards row */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreSnapshotCard
          overall={latest.overall}
          band={latest.band}
          examDate={latest.examDate}
          scaleScores={latest.scaleScores}
          included={latest.included}
          notes={latest.notes}
        />
        <ProgressDeltaCard
          overall={latest.overall}
          previousOverall={previous?.overall}
          band={latest.band}
          scaleScores={latest.scaleScores}
          previousScaleScores={previous?.scaleScores}
        />
        <SkillSpotlightCard scaleScores={latest.scaleScores} />
      </div>

      {/* Chart */}
      <div className="mt-6">
        <OverallChart data={chartData} />
      </div>
    </>
  );
}
