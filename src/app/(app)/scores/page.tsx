"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { ScoreHistoryTable } from "~/components/score-history-table";
import { ScoreEntryForm } from "~/components/score-entry-form";
import { ConfirmDeleteDialog } from "~/components/confirm-delete-dialog";

type ScoreEntry = {
  id: string;
  examDate: Date;
  reading: number | null;
  useOfEnglish: number | null;
  writing: number | null;
  listening: number | null;
  speaking: number | null;
  notes?: string | null;
  scaleScores: Record<string, number>;
  overall: number;
  band: { label: string };
};

export default function ScoresPage() {
  const utils = api.useUtils();
  const { data: me } = api.user.me.useQuery();
  const { data: scores, isLoading } = api.score.list.useQuery();
  const hasGroup = !!me?.activeGroup;

  const [formOpen, setFormOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<ScoreEntry | null>(null);
  const [deletingScore, setDeletingScore] = useState<ScoreEntry | null>(null);

  const createMutation = api.score.create.useMutation({
    onSuccess: () => {
      void utils.score.invalidate();
      setFormOpen(false);
    },
  });

  const updateMutation = api.score.update.useMutation({
    onSuccess: () => {
      void utils.score.invalidate();
      setEditingScore(null);
    },
  });

  const deleteMutation = api.score.delete.useMutation({
    onSuccess: () => {
      void utils.score.invalidate();
      setDeletingScore(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Score History"
        description="View and manage all your exam score entries"
        action={
          hasGroup ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              New Score
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      ) : !scores || scores.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <span className="text-base font-semibold text-[var(--foreground)]">
            No scores yet
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            Click &quot;New Score&quot; to log your first exam.
          </span>
        </div>
      ) : (
        <ScoreHistoryTable
          scores={scores as unknown as ScoreEntry[]}
          onEdit={(score) => setEditingScore(score as ScoreEntry)}
          onDelete={(score) => setDeletingScore(score as ScoreEntry)}
        />
      )}

      {/* Create form */}
      <ScoreEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
        error={createMutation.error?.message}
      />

      {/* Edit form */}
      {editingScore && (
        <ScoreEntryForm
          key={editingScore.id}
          open={!!editingScore}
          onOpenChange={(open) => !open && setEditingScore(null)}
          isSubmitting={updateMutation.isPending}
          initialValues={editingScore}
          onSubmit={(values) =>
            updateMutation.mutate({ id: editingScore.id, ...values })
          }
          error={updateMutation.error?.message}
        />
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
