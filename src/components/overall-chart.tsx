"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type ChartEntry = {
  date: string;
  overall: number;
};

export function OverallChart({ data }: { data: ChartEntry[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-[var(--foreground)]">
            Overall Progress
          </span>
          <span className="text-[13px] text-[var(--muted-foreground)]">
            Cambridge Scale score over time
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <ReferenceLine
              y={200}
              stroke="var(--band-grade-c)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "C2 Pass",
                position: "right",
                fontSize: 10,
                fill: "var(--band-grade-c)",
              }}
            />
            <Area
              type="monotone"
              dataKey="overall"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#overallGradient)"
              dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
