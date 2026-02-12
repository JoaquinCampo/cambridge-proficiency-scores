"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { ScoreSnapshotCard } from "~/components/score-snapshot-card";
import { ProgressDeltaCard } from "~/components/progress-delta-card";
import { SkillSpotlightCard } from "~/components/skill-spotlight-card";
import { OverallChart } from "~/components/overall-chart";
import { ScoreEntryForm } from "~/components/score-entry-form";
import { ConfirmDeleteDialog } from "~/components/confirm-delete-dialog";
import { redirect } from "next/navigation";
import { StatCardsSkeleton, CardSkeleton } from "~/components/skeleton";



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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 py-6">
          <div className="skeleton skeleton-heading" />
          <div className="skeleton skeleton-text w-48" />
        </div>
        <StatCardsSkeleton />
        <CardSkeleton height={300} />
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
        <div className="flex flex-col gap-6">
          <StatCardsSkeleton />
          <CardSkeleton height={300} />
        </div>
      </>
    );
  }

  const hasGroup = !!me?.activeGroup;

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
              {hasGroup ? "No scores yet" : "No group assigned"}
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              {hasGroup
                ? "Log your first practice exam to start tracking your progress."
                : "Ask your teacher to add you to a group before logging scores."}
            </span>
          </div>
          {hasGroup && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Log First Score
            </button>
          )}
        </div>

        {hasGroup && (
          <ScoreEntryForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            isSubmitting={createMutation.isPending}
            onSubmit={(values) => createMutation.mutate(values)}
            error={createMutation.error?.message}
          />
        )}
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
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[#6D28D9] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow-md"
            style={{ transition: "all var(--transition-fast)" }}
          >
            <Plus className="h-4 w-4" />
            New Score
          </button>
        }
      />

      {/* Cards row */}
      <div className="stagger-children grid grid-cols-3 gap-4">
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

      {/* Chart */}
      <div className="animate-in-delay-3 mt-6">
        <OverallChart data={chartData} />
      </div>

      {/* Create dialog */}
      <ScoreEntryForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
        error={createMutation.error?.message}
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
        error={updateMutation.error?.message}
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
