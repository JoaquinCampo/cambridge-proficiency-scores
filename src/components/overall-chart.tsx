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

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke="var(--primary)" strokeWidth={2.5} />
    </g>
  );
}

function CustomActiveDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="var(--primary)" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke="var(--primary)" strokeWidth={2.5} />
    </g>
  );
}

export function OverallChart({ data }: { data: ChartEntry[] }) {
  return (
    <div className="card-static">
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
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.12} />
                <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.04} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} />
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
                boxShadow: "var(--shadow-card-hover)",
              }}
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.15, strokeWidth: 1 }}
            />
            <ReferenceLine
              y={200}
              stroke="var(--band-grade-c)"
              strokeDasharray="6 4"
              strokeWidth={1}
              strokeOpacity={0.5}
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
              strokeWidth={2.5}
              fill="url(#overallGradient)"
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
