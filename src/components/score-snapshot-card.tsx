"use client";

import { BandBadge } from "./band-badge";
import { Pencil, Trash2, MessageSquareText, List } from "lucide-react";
import { useCountUp } from "~/hooks/use-count-up";
import type { ComponentKey } from "~/lib/scoring";

const skillConfig: Record<ComponentKey, { label: string; color: string }> = {
  reading: { label: "Reading", color: "var(--skill-reading)" },
  useOfEnglish: { label: "Use of Eng.", color: "var(--skill-uoe)" },
  writing: { label: "Writing", color: "var(--skill-writing)" },
  listening: { label: "Listening", color: "var(--skill-listening)" },
  speaking: { label: "Speaking", color: "var(--skill-speaking)" },
};

type ScaleScores = Partial<Record<ComponentKey, number>>;

export function ScoreSnapshotCard({
  overall,
  band,
  examDate,
  scaleScores,
  included,
  notes,
  onEdit,
  onDelete,
  onViewAll,
}: {
  overall: number;
  band: { label: string };
  examDate: Date;
  scaleScores: ScaleScores;
  included: number;
  notes?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewAll?: () => void;
}) {
  const animatedOverall = useCountUp(overall, 800);

  const dateStr = new Date(examDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card-base">
      {/* Hero section */}
      <div className="flex items-center gap-5 px-7 py-6">
        {/* Score ring */}
        <div
          className="score-ring flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            border: "4px solid transparent",
            backgroundImage: "linear-gradient(var(--card), var(--card)), linear-gradient(135deg, var(--primary), #6D28D9)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <span className="font-display text-[28px] font-bold tracking-tight text-[var(--foreground)]">
            {animatedOverall}
          </span>
        </div>
        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-semibold text-[var(--foreground)]">
            {dateStr}
          </span>
          <div className="flex items-center gap-2">
            <BandBadge label={band.label} />
            <span className="text-[13px] text-[var(--muted-foreground)]">
              {included}/5 skills
            </span>
          </div>
        </div>
      </div>

      {/* Skill bars */}
      <div className="stagger-children flex flex-col gap-2.5 px-7 pb-5">
        {(Object.keys(skillConfig) as ComponentKey[]).map((key) => {
          const config = skillConfig[key];
          const score = scaleScores[key];
          if (score == null) return null;
          // Map 162–230 to 0–100% bar width
          const pct = Math.max(0, Math.min(100, ((score - 162) / (230 - 162)) * 100));
          return (
            <div key={key} className="flex items-center gap-2.5">
              <span className="w-20 text-xs font-medium text-[var(--muted-foreground)]">
                {config.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]">
                <div
                  className="animate-bar h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: config.color }}
                />
              </div>
              <span className="w-7 text-right text-xs font-semibold text-[var(--foreground)]">
                {score}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-7 py-3">
        <div className="flex items-center gap-1.5">
          {notes && (
            <>
              <MessageSquareText className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <span className="text-xs text-[var(--muted-foreground)]">
                {notes}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              style={{ transition: "all var(--transition-fast)" }}
            >
              <List className="h-3.5 w-3.5" />
              All entries
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded p-1 hover:bg-[var(--secondary)]"
              style={{ transition: "background var(--transition-fast)" }}
            >
              <Pencil className="h-4 w-4 text-[var(--muted-foreground)]" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded p-1 hover:bg-[var(--secondary)]"
              style={{ transition: "background var(--transition-fast)" }}
            >
              <Trash2 className="h-4 w-4 text-[var(--muted-foreground)]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
