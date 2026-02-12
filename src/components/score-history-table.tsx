"use client";

import { MoreHorizontal } from "lucide-react";
import { BandBadge } from "./band-badge";
import type { ComponentKey } from "~/lib/scoring";
import { useState, useRef, useEffect } from "react";

type EnrichedScore = {
  id: string;
  examDate: Date;
  scaleScores: Partial<Record<ComponentKey, number>>;
  overall: number;
  band: { label: string };
  notes?: string | null;
};

const skillCols: { key: ComponentKey; label: string }[] = [
  { key: "reading", label: "R" },
  { key: "useOfEnglish", label: "UoE" },
  { key: "writing", label: "W" },
  { key: "listening", label: "L" },
  { key: "speaking", label: "S" },
];

function RowMenu({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1 hover:bg-[var(--secondary)]"
      >
        <MoreHorizontal className="h-5 w-5 text-[var(--muted-foreground)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-32 rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
          {onEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--secondary)]"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-[var(--destructive)] hover:bg-[var(--secondary)]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ScoreHistoryTable({
  scores,
  onEdit,
  onDelete,
}: {
  scores: EnrichedScore[];
  onEdit?: (score: EnrichedScore) => void;
  onDelete: (score: EnrichedScore) => void;
}) {
  return (
    <div className="card-static">
      {/* Header */}
      <div className="flex items-center border-b-2 border-[var(--border)] px-0 py-2.5">
        <span className="w-[120px] shrink-0 pl-4 text-xs font-semibold text-[var(--muted-foreground)]">
          Date
        </span>
        {skillCols.map((col) => (
          <span
            key={col.key}
            className="flex-1 text-center text-xs font-semibold text-[var(--muted-foreground)]"
          >
            {col.label}
          </span>
        ))}
        <span className="flex-1 text-center text-xs font-semibold text-[var(--muted-foreground)]">
          Overall
        </span>
        <span className="w-20 text-center text-xs font-semibold text-[var(--muted-foreground)]">
          Band
        </span>
        <span className="w-[60px]" />
      </div>

      {/* Rows */}
      {scores.map((score) => (
        <div
          key={score.id}
          className="flex items-center border-b border-[var(--border)] px-0 py-3.5 last:border-b-0"
        >
          <span className="w-[120px] shrink-0 pl-4 text-sm font-medium text-[var(--foreground)]">
            {new Date(score.examDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {skillCols.map((col) => {
            const val = score.scaleScores[col.key];
            return (
              <div key={col.key} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {col.label}
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {val ?? "—"}
                </span>
              </div>
            );
          })}
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <span className="text-[11px] text-[var(--muted-foreground)]">
              Overall
            </span>
            <span className="text-sm font-bold text-[var(--foreground)]">
              {score.overall}
            </span>
          </div>
          <div className="flex w-20 justify-center">
            <BandBadge label={score.band.label} />
          </div>
          <div className="flex w-[60px] justify-end pr-4">
            <RowMenu
              onEdit={onEdit ? () => onEdit(score) : undefined}
              onDelete={() => onDelete(score)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
