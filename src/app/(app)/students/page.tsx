"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { BandBadge } from "~/components/band-badge";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function StudentsPage() {
  const { data: users, isLoading: usersLoading } = api.user.list.useQuery();
  const { data: latestScores, isLoading: scoresLoading } =
    api.score.latestByStudent.useQuery();

  const isLoading = usersLoading || scoresLoading;

  return (
    <>
      <PageHeader
        title="Students"
        description="Monitor student progress across your group"
      />

      {isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
      ) : !users || users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16">
          <span className="text-base font-semibold text-[var(--foreground)]">
            No students yet
          </span>
          <span className="text-sm text-[var(--muted-foreground)]">
            Students will appear here once they join your organization.
          </span>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          {users.map((user) => {
            const scoreData = latestScores?.[user.clerkId];
            const latest = scoreData?.latest;
            const previous = scoreData?.previous;
            const delta =
              latest && previous ? latest.overall - previous.overall : null;

            return (
              <Link
                key={user.clerkId}
                href={`/students/${user.clerkId}`}
                className="flex items-center gap-3.5 border-b border-[var(--border)] px-6 py-3.5 transition-colors last:border-b-0 hover:bg-[var(--secondary)]/50"
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                  <span className="text-sm font-semibold text-white">
                    {getInitials(user.name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-[var(--foreground)]">
                    {user.name ?? "Unnamed"}
                  </span>
                  <span className="truncate text-xs text-[var(--muted-foreground)]">
                    {user.email}
                  </span>
                </div>

                {/* Score + trend */}
                {latest && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-[var(--foreground)]">
                      {latest.overall}
                    </span>
                    {delta != null && (
                      <span
                        className="flex items-center gap-0.5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor:
                            delta >= 0
                              ? "rgba(22,163,74,0.1)"
                              : "rgba(220,38,38,0.1)",
                          color:
                            delta >= 0
                              ? "var(--band-grade-a)"
                              : "var(--destructive)",
                        }}
                      >
                        {delta >= 0 ? (
                          <TrendingUp className="h-2.5 w-2.5" />
                        ) : (
                          <TrendingDown className="h-2.5 w-2.5" />
                        )}
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </span>
                    )}
                  </div>
                )}

                {/* Band */}
                {latest && <BandBadge label={latest.band.label} />}

                {/* Chevron */}
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[var(--muted-foreground)]" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
