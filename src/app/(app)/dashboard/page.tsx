"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  ChartNoAxesColumn,
  GraduationCap,
  Trophy,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  CircleAlert,
  Timer,
  Puzzle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { GroupSelector } from "~/components/group-selector";
import { StatCardsSkeleton, CardSkeleton } from "~/components/skeleton";

const SKILL_COLORS: Record<string, string> = {
  reading: "var(--skill-reading)",
  useOfEnglish: "var(--skill-uoe)",
  writing: "var(--skill-writing)",
  listening: "var(--skill-listening)",
  speaking: "var(--skill-speaking)",
};

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  useOfEnglish: "Use of Eng.",
  writing: "Writing",
  listening: "Listening",
  speaking: "Speaking",
};

const BAND_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "rgba(5,150,105,0.1)", text: "var(--band-grade-a)" },
  B: { bg: "rgba(67,56,202,0.1)", text: "var(--band-grade-b)" },
  C: { bg: "rgba(124,58,237,0.1)", text: "var(--band-grade-c)" },
  C1: { bg: "rgba(217,119,6,0.1)", text: "var(--band-c1)" },
  below: { bg: "rgba(161,161,170,0.1)", text: "var(--band-below-c1)" },
};

const BAND_LABELS: Record<string, string> = {
  A: "Grade A",
  B: "Grade B",
  C: "Grade C",
  C1: "C1",
  below: "Below",
};

const REASON_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; Icon: typeof TrendingDown }
> = {
  regressing: {
    label: "Regressing",
    bg: "rgba(185,28,28,0.08)",
    text: "var(--destructive)",
    Icon: TrendingDown,
  },
  below_pass: {
    label: "Below Pass",
    bg: "rgba(161,161,170,0.1)",
    text: "var(--band-below-c1)",
    Icon: CircleAlert,
  },
  inactive: {
    label: "Inactive 4w",
    bg: "rgba(217,119,6,0.1)",
    text: "var(--band-c1)",
    Icon: Timer,
  },
  incomplete: {
    label: "Incomplete",
    bg: "rgba(124,58,237,0.08)",
    text: "var(--band-grade-c)",
    Icon: Puzzle,
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { data, isLoading } = api.score.dashboard.useQuery({
    groupId: selectedGroupId ?? undefined,
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Loading class overview..."
        />
        <div className="flex flex-col gap-6">
          <StatCardsSkeleton />
          <div className="flex gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <CardSkeleton height={180} />
              <CardSkeleton height={320} />
            </div>
            <div className="flex w-[340px] shrink-0 flex-col gap-6">
              <CardSkeleton height={200} />
              <CardSkeleton height={160} />
            </div>
          </div>
        </div>
      </>
    );
  }

  const bandTotal = Object.values(data.bandDistribution).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${data.totalStudents} students — class overview`}
      />

      {/* Group Filter */}
      <div className="mb-5">
        <GroupSelector value={selectedGroupId} onChange={setSelectedGroupId} />
      </div>

      {/* Stats Row */}
      <div className="stagger-children grid grid-cols-3 gap-4">
        <StatCard
          label="Total Students"
          value={String(data.totalStudents)}
          subtext="in this group"
          icon={<Users className="h-5 w-5" />}
          iconBg="rgba(67,56,202,0.08)"
          iconColor="var(--primary)"
        />
        <StatCard
          label="Class Average"
          value={String(data.classAverage)}
          subtext="Cambridge Scale"
          icon={<ChartNoAxesColumn className="h-5 w-5" />}
          iconBg="rgba(124,58,237,0.08)"
          iconColor="var(--band-grade-c)"
        />
        <StatCard
          label="C2 Pass Rate"
          value={`${data.passRate}%`}
          subtext={`${data.passing} of ${data.totalStudents} scoring 200+`}
          icon={<GraduationCap className="h-5 w-5" />}
          iconBg="rgba(5,150,105,0.08)"
          iconColor="var(--band-grade-a)"
        />
      </div>

      {/* Main columns */}
      <div className="mt-6 flex gap-6">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Band Distribution */}
          <Card>
            <CardHeader
              title="Band Distribution"
              subtitle="How students are distributed across Cambridge bands"
            />
            <div className="px-6 pb-6">
              {/* Stacked bar */}
              {bandTotal > 0 && (
                <div className="flex h-8 gap-1">
                  {(
                    Object.entries(data.bandDistribution) as [string, number][]
                  ).map(([key, count]) => {
                    if (count === 0) return null;
                    const pct = (count / bandTotal) * 100;
                    const color = BAND_COLORS[key];
                    return (
                      <div
                        key={key}
                        className="rounded-[var(--radius-sm)]"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color?.text,
                        }}
                      />
                    );
                  })}
                </div>
              )}
              {/* Legend */}
              <div className="mt-4 flex justify-between">
                {Object.entries(data.bandDistribution).map(([key, count]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{
                        backgroundColor: BAND_COLORS[key]?.text,
                      }}
                    />
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {BAND_LABELS[key]} ({count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Class Progress Chart */}
          <Card>
            <CardHeader
              title="Class Progress Over Time"
              subtitle="Average Cambridge Scale score across all students"
            />
            <div className="px-6 pb-6">
              {data.classProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.classProgress}>
                    <defs>
                      <linearGradient
                        id="gradPrimary"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--primary)"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      strokeOpacity={0.6}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
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
                        borderRadius: "var(--radius-m)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="average"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#gradPrimary)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                  No data yet
                </p>
              )}
            </div>
          </Card>

          {/* Students Needing Attention */}
          <Card>
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-2.5">
                <TriangleAlert
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--band-c1)" }}
                />
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    Students Needing Attention
                  </h3>
                  <p className="text-[13px] text-[var(--muted-foreground)]">
                    Auto-flagged based on recent activity and performance
                  </p>
                </div>
              </div>
              {data.attention.length > 0 && (
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(217,119,6,0.1)",
                    color: "var(--band-c1)",
                  }}
                >
                  {data.attention.length} student
                  {data.attention.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {data.attention.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-[var(--muted-foreground)]">
                  All students are on track!
                </p>
              </div>
            ) : (
              <>
                {data.attention.slice(0, 4).map((s) => {
                  const config = REASON_CONFIG[s.reason] ?? REASON_CONFIG.incomplete!;
                  const ReasonIcon = config.Icon;
                  return (
                    <Link
                      key={s.userId}
                      href={`/students/${s.userId}`}
                      className="flex items-center gap-3.5 border-b border-[var(--border)] px-6 py-3.5 transition-colors last:border-b-0 hover:bg-[var(--secondary)]/50"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: (REASON_CONFIG[s.reason] ?? REASON_CONFIG.incomplete!).bg,
                        }}
                      >
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: (REASON_CONFIG[s.reason] ?? REASON_CONFIG.incomplete!).text,
                          }}
                        >
                          {getInitials(s.name)}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-[var(--foreground)]">
                          {s.name}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {s.detail}
                        </span>
                      </div>
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: config.bg,
                          color: config.text,
                        }}
                      >
                        <ReasonIcon className="h-[11px] w-[11px]" />
                        {config.label}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    </Link>
                  );
                })}
                {data.attention.length > 4 && (
                  <div className="border-t border-[var(--border)] px-6 py-4">
                    <Link
                      href="/students?filter=attention"
                      className="flex items-center justify-center gap-1.5 rounded-[var(--radius-m)] bg-[var(--secondary)] px-4 py-2.5 transition-colors hover:bg-[var(--border)]"
                    >
                      <span className="text-[13px] font-medium text-[var(--foreground)]">
                        View all {data.attention.length} flagged students
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex w-[340px] shrink-0 flex-col gap-6">
          {/* Class Skill Averages */}
          <Card>
            <CardHeader
              title="Class Skill Averages"
              subtitle="Average scale score per skill"
            />
            <div className="flex flex-col gap-3 px-6 pb-5">
              {Object.entries(data.skillAverages).map(([key, value]) => {
                // Scale bar width: 162 is 0%, 230 is 100%
                const pct = Math.max(
                  0,
                  Math.min(100, ((value - 162) / (230 - 162)) * 100),
                );
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <span className="w-[76px] text-xs font-medium text-[var(--muted-foreground)]">
                      {SKILL_LABELS[key]}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]">
                      <div
                        className="animate-bar absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: SKILL_COLORS[key],
                        }}
                      />
                    </div>
                    <span className="w-7 text-right text-xs font-semibold text-[var(--foreground)]">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Performers */}
          <Card>
            <div className="flex items-center gap-2.5 px-5 py-4">
              <Trophy
                className="h-4 w-4"
                style={{ color: "var(--band-grade-a)" }}
              />
              <span className="font-display text-sm font-semibold text-[var(--foreground)]">
                Top Performers
              </span>
            </div>
            <div className="flex flex-col px-5 pb-4">
              {data.topPerformers.map((s, i) => (
                <div
                  key={s.userId}
                  className="flex items-center gap-3 rounded-[var(--radius-m)] px-2 py-2.5 transition-colors hover:bg-[var(--secondary)]/60"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: i === 0 ? "rgba(5,150,105,0.1)" : "var(--secondary)",
                      color: i === 0 ? "var(--band-grade-a)" : "var(--muted-foreground)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[13px] font-medium text-[var(--foreground)]">
                    {s.name}
                  </span>
                  <span
                    className="font-display text-[14px] font-bold tabular-nums"
                    style={{
                      color:
                        s.band.label === "Grade A"
                          ? "var(--band-grade-a)"
                          : "var(--band-grade-b)",
                    }}
                  >
                    {s.overall}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Most Improved */}
          <Card>
            <div className="flex items-center gap-2.5 px-5 py-4">
              <TrendingUp
                className="h-4 w-4"
                style={{ color: "var(--band-grade-a)" }}
              />
              <span className="font-display text-sm font-semibold text-[var(--foreground)]">
                Most Improved
              </span>
            </div>
            <div className="flex flex-col px-5 pb-4">
              {data.mostImproved.map((s) => (
                <div
                  key={s.userId}
                  className="flex items-center gap-3 rounded-[var(--radius-m)] px-2 py-2.5 transition-colors hover:bg-[var(--secondary)]/60"
                >
                  <span className="flex-1 truncate text-[13px] font-medium text-[var(--foreground)]">
                    {s.name}
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "rgba(5,150,105,0.1)",
                      color: "var(--band-grade-a)",
                    }}
                  >
                    <TrendingUp className="h-[11px] w-[11px]" />+{s.delta}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// -- Helper components ---------------------------------------------------- //

function StatCard({
  label,
  value,
  subtext,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="card-base flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--muted-foreground)]">
          {label}
        </span>
        <div
          className="icon-well"
          style={{
            backgroundColor: iconBg ?? "var(--secondary)",
            color: iconColor ?? "var(--muted-foreground)",
          }}
        >
          {icon}
        </div>
      </div>
      <span className="font-display text-[36px] font-bold leading-none tracking-tight text-[var(--foreground)]">
        {value}
      </span>
      <span className="text-[11px] text-[var(--muted-foreground)]">{subtext}</span>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-static overflow-hidden">
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-6 py-5">
      <h3 className="font-display text-[15px] font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="text-[13px] text-[var(--muted-foreground)]">{subtitle}</p>
    </div>
  );
}
