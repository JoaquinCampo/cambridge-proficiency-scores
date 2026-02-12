import { ArrowUp, Target } from "lucide-react";
import type { ComponentKey } from "~/lib/scoring";

const skillLabels: Record<ComponentKey, string> = {
  reading: "Reading",
  useOfEnglish: "Use of English",
  writing: "Writing",
  listening: "Listening",
  speaking: "Speaking",
};

type ScaleScores = Partial<Record<ComponentKey, number>>;

export function SkillSpotlightCard({
  scaleScores,
}: {
  scaleScores: ScaleScores;
}) {
  const entries = Object.entries(scaleScores).filter(
    (e): e is [ComponentKey, number] => e[1] != null,
  );
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0]!;
  const weakest = sorted[sorted.length - 1]!;

  return (
    <div className="card-base">
      {/* Strongest */}
      <div className="flex items-center gap-3.5 px-6 py-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(5,150,105,0.1)" }}
        >
          <ArrowUp className="h-[18px] w-[18px]" style={{ color: "var(--band-grade-a)" }} />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            Strongest skill
          </span>
          <span className="text-[15px] font-semibold text-[var(--foreground)]">
            {skillLabels[strongest[0]]}
          </span>
        </div>
        <span className="text-xl font-bold" style={{ color: "var(--band-grade-a)" }}>
          {strongest[1]}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border)]" />

      {/* Weakest */}
      <div className="flex items-center gap-3.5 px-6 py-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(185,28,28,0.1)" }}
        >
          <Target className="h-[18px] w-[18px]" style={{ color: "var(--destructive)" }} />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            Focus area
          </span>
          <span className="text-[15px] font-semibold text-[var(--foreground)]">
            {skillLabels[weakest[0]]}
          </span>
        </div>
        <span className="text-xl font-bold" style={{ color: "var(--destructive)" }}>
          {weakest[1]}
        </span>
      </div>
    </div>
  );
}
