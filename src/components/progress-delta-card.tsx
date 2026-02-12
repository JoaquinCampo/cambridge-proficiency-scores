"use client";

import { BandBadge } from "./band-badge";
import { TrendingUp } from "lucide-react";
import { useCountUp } from "~/hooks/use-count-up";
import type { ComponentKey } from "~/lib/scoring";

const skillShort: Record<ComponentKey, { label: string; bg: string; text: string }> = {
  reading: { label: "R", bg: "rgba(37,99,235,0.08)", text: "var(--skill-reading)" },
  useOfEnglish: { label: "UoE", bg: "rgba(124,58,237,0.08)", text: "var(--skill-uoe)" },
  writing: { label: "W", bg: "rgba(22,163,74,0.08)", text: "var(--skill-writing)" },
  listening: { label: "L", bg: "rgba(217,119,6,0.08)", text: "var(--skill-listening)" },
  speaking: { label: "S", bg: "rgba(220,38,38,0.08)", text: "var(--skill-speaking)" },
};

type ScaleScores = Partial<Record<ComponentKey, number>>;

export function ProgressDeltaCard({
  overall,
  previousOverall,
  band,
  scaleScores,
  previousScaleScores,
}: {
  overall: number;
  previousOverall?: number;
  band: { label: string };
  scaleScores: ScaleScores;
  previousScaleScores?: ScaleScores;
}) {
  const animatedOverall = useCountUp(overall, 800);
  const overallDelta = previousOverall != null ? overall - previousOverall : null;

  return (
    <div className="card-base p-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-[var(--muted-foreground)]">
            Latest Overall
          </span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--foreground)]">
              {animatedOverall}
            </span>
            {overallDelta != null && (
              <span
                className="flex items-center gap-0.5 text-xs font-semibold"
                style={{
                  color:
                    overallDelta >= 0
                      ? "var(--band-grade-a)"
                      : "var(--destructive)",
                }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {overallDelta >= 0 ? "+" : ""}
                {overallDelta}
              </span>
            )}
          </div>
        </div>
        <BandBadge label={band.label} />
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-[var(--border)]" />

      {/* Skill deltas */}
      <span className="text-xs font-medium text-[var(--muted-foreground)]">
        Since last exam
      </span>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(skillShort) as ComponentKey[]).map((key) => {
          const config = skillShort[key];
          const current = scaleScores[key];
          const prev = previousScaleScores?.[key];
          if (current == null) return null;
          const delta = prev != null ? current - prev : null;
          return (
            <div
              key={key}
              className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: config.bg }}
            >
              <span className="text-[11px] font-semibold" style={{ color: config.text }}>
                {config.label}
              </span>
              {delta != null && (
                <span
                  className="text-[11px] font-semibold"
                  style={{
                    color:
                      delta >= 0
                        ? "var(--band-grade-a)"
                        : "var(--destructive)",
                  }}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
