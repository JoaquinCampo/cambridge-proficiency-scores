"use client";

import { useState } from "react";
import { Plus, Lightbulb } from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { ScoreSnapshotCard } from "~/components/score-snapshot-card";
import { ProgressDeltaCard } from "~/components/progress-delta-card";
import { SkillSpotlightCard } from "~/components/skill-spotlight-card";
import { OverallChart } from "~/components/overall-chart";
import { ScoreEntryForm } from "~/components/score-entry-form";
import { ConfirmDeleteDialog } from "~/components/confirm-delete-dialog";
import { redirect } from "next/navigation";
import type { ComponentKey } from "~/lib/scoring";

const skillLabels: Record<ComponentKey, string> = {
  reading: "Reading",
  useOfEnglish: "Use of English",
  writing: "Writing",
  listening: "Listening",
  speaking: "Speaking",
};

// Actionable tips per skill when it's the weakest
const skillTips: Record<ComponentKey, string> = {
  reading:
    "Focus on skimming techniques and timed practice with C2-level texts. Try reading academic articles and summarising the main argument in one sentence.",
  useOfEnglish:
    "Strengthen collocations and word formation. Practice open cloze and key word transformations daily — consistency beats volume.",
  writing:
    "Work on essay structure: clear thesis, developed paragraphs, and a strong conclusion. Practise writing under timed conditions (1h 30m).",
  listening:
    "Listen to podcasts and lectures at natural speed. Focus on Part 3 (multiple matching) — pause and predict before checking answers.",
  speaking:
    "Record yourself answering Part 2 prompts (1 minute monologue). Focus on fluency over accuracy — hesitation costs more than minor errors.",
};

export default function HomePage() {
  const { data: me, isLoading: meLoading } = api.user.me.useQuery();
  const utils = api.useUtils();
  const { data: scores, isLoading: scoresLoading } =
    api.score.progress.useQuery(undefined, {
      enabled: me?.role === "student",
    });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createMutation = api.score.create.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      void utils.score.invalidate();
    },
  });

  const updateMutation = api.score.update.useMutation({
    onSuccess: () => {
      setEditOpen(false);
      void utils.score.progress.invalidate();
    },
  });

  const deleteMutation = api.score.delete.useMutation({
    onSuccess: () => {
      setDeleteOpen(false);
      void utils.score.progress.invalidate();
    },
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
        <div className="flex flex-col items-center justify-center gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] bg-opacity-10">
            <Plus className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-base font-semibold text-[var(--foreground)]">
              No scores yet
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              Log your first practice exam to start tracking your progress.
            </span>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Log First Score
          </button>
        </div>

        <ScoreEntryForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          isSubmitting={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </>
    );
  }

  const latest = scores[scores.length - 1]!;
  const previous = scores.length >= 2 ? scores[scores.length - 2] : undefined;

  // Find weakest skill for recommendation
  const skillEntries = Object.entries(latest.scaleScores).filter(
    (e): e is [ComponentKey, number] => e[1] != null,
  );
  const weakest = skillEntries.length > 0
    ? [...skillEntries].sort((a, b) => a[1] - b[1])[0]!
    : null;

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
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            New Score
          </button>
        }
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
          onEdit={() => setEditOpen(true)}
          onDelete={() => setDeleteOpen(true)}
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

      {/* Skill recommendation */}
      {weakest && weakest[1] < 200 && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-6 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-[var(--skill-listening)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Focus: {skillLabels[weakest[0]]} ({weakest[1]})
            </span>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
            {skillTips[weakest[0]]}
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="mt-6">
        <OverallChart data={chartData} />
      </div>

      {/* Create dialog */}
      <ScoreEntryForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      {/* Edit dialog */}
      <ScoreEntryForm
        key={latest.id}
        open={editOpen}
        onOpenChange={setEditOpen}
        initialValues={{
          examDate: latest.examDate,
          reading: latest.reading,
          useOfEnglish: latest.useOfEnglish,
          writing: latest.writing,
          listening: latest.listening,
          speaking: latest.speaking,
          notes: latest.notes,
        }}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => {
          updateMutation.mutate({
            id: latest.id,
            ...values,
          });
        }}
      />

      {/* Delete dialog */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        examDate={latest.examDate}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate({ id: latest.id });
        }}
      />
    </>
  );
}
