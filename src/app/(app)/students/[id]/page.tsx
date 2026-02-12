"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "~/trpc/react";
import { ScoreSnapshotCard } from "~/components/score-snapshot-card";
import { ProgressDeltaCard } from "~/components/progress-delta-card";
import { SkillSpotlightCard } from "~/components/skill-spotlight-card";
import { OverallChart } from "~/components/overall-chart";
import { SkillProgressChart } from "~/components/skill-progress-chart";
import { ScaleReferenceBar } from "~/components/scale-reference-bar";
import { ScoreHistoryTable } from "~/components/score-history-table";
import { ConfirmDeleteDialog } from "~/components/confirm-delete-dialog";
import type { ComponentKey } from "~/lib/scoring";

type ScoreEntry = {
  id: string;
  examDate: Date;
  scaleScores: Partial<Record<ComponentKey, number>>;
  overall: number;
  band: { label: string };
  notes?: string | null;
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const historyRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading: userLoading } = api.user.get.useQuery({
    userId: id,
  });
  const { data: scores, isLoading: scoresLoading } =
    api.score.studentProgress.useQuery({ studentId: id });

  const [deletingScore, setDeletingScore] = useState<ScoreEntry | null>(null);

  const deleteMutation = api.score.deleteAsTeacher.useMutation({
    onSuccess: () => {
      setDeletingScore(null);
      void utils.score.studentProgress.invalidate({ studentId: id });
    },
  });

  const isLoading = userLoading || scoresLoading;

  if (isLoading) {
    return (
      <div className="py-6">
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  const latest = scores && scores.length > 0 ? scores[scores.length - 1] : undefined;
  const previous = scores && scores.length >= 2 ? scores[scores.length - 2] : undefined;

  // Scores come in asc order from studentProgress; reverse for table (newest first)
  const tableScores = scores ? [...scores].reverse() : [];

  const overallData = (scores ?? []).map((s) => ({
    date: new Date(s.examDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overall: s.overall,
  }));

  const skillData = (scores ?? []).map((s) => ({
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

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4 py-6">
        <Link
          href="/students"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--secondary)]"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--muted-foreground)]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {user?.name ?? "Student"}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {user?.email}
          </p>
        </div>
      </div>

      {!latest ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <span className="text-base font-semibold text-[var(--foreground)]">
            No scores yet
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            This student hasn&apos;t logged any exam scores.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Cards row */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreSnapshotCard
              overall={latest.overall}
              band={latest.band}
              examDate={latest.examDate}
              scaleScores={latest.scaleScores}
              included={latest.included}
              notes={latest.notes}
              onViewAll={scrollToHistory}
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

          {/* Charts */}
          <OverallChart data={overallData} />
          <SkillProgressChart data={skillData} />
          <ScaleReferenceBar />

          {/* Score history */}
          <div ref={historyRef}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Score History
              </h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                {tableScores.length} entry{tableScores.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <ScoreHistoryTable
              scores={tableScores as unknown as ScoreEntry[]}
              onDelete={(score) => setDeletingScore(score)}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={!!deletingScore}
        onOpenChange={(open) => !open && setDeletingScore(null)}
        examDate={deletingScore?.examDate}
        isDeleting={deleteMutation.isPending}
        onConfirm={() =>
          deletingScore && deleteMutation.mutate({ id: deletingScore.id })
        }
      />
    </>
  );
}
