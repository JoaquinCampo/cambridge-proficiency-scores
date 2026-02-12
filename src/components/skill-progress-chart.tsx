"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ComponentKey } from "~/lib/scoring";

const skillConfig: Record<ComponentKey, { label: string; color: string }> = {
  reading: { label: "Reading", color: "var(--skill-reading)" },
  useOfEnglish: { label: "Use of English", color: "var(--skill-uoe)" },
  writing: { label: "Writing", color: "var(--skill-writing)" },
  listening: { label: "Listening", color: "var(--skill-listening)" },
  speaking: { label: "Speaking", color: "var(--skill-speaking)" },
};

type ChartEntry = {
  date: string;
} & Partial<Record<ComponentKey, number>>;

export function SkillProgressChart({ data }: { data: ChartEntry[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-[var(--foreground)]">
            Per-Skill Progress
          </span>
          <span className="text-[13px] text-[var(--muted-foreground)]">
            Individual skill scale scores over time
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[162, 230]}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-m)",
                fontSize: 13,
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            {(Object.keys(skillConfig) as ComponentKey[]).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={skillConfig[key].label}
                stroke={skillConfig[key].color}
                strokeWidth={2}
                dot={{ r: 2.5, strokeWidth: 0, fill: skillConfig[key].color }}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
