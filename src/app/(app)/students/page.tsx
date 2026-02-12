"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Search,
  AlertTriangle,
} from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { GroupSelector } from "~/components/group-selector";
import { BandBadge } from "~/components/band-badge";
import { StudentListSkeleton } from "~/components/skeleton";
import { REASON_CONFIG, type AttentionReason } from "~/lib/attention";
import type { ComponentKey } from "~/lib/scoring";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SKILL_KEYS: ComponentKey[] = [
  "reading",
  "useOfEnglish",
  "writing",
  "listening",
  "speaking",
];

const SKILL_COLORS: Record<ComponentKey, string> = {
  reading: "var(--skill-reading)",
  useOfEnglish: "var(--skill-uoe)",
  writing: "var(--skill-writing)",
  listening: "var(--skill-listening)",
  speaking: "var(--skill-speaking)",
};

const BAND_FILTERS = [
  { value: "all", label: "All" },
  { value: "Grade A", label: "Grade A" },
  { value: "Grade B", label: "Grade B" },
  { value: "Grade C", label: "Grade C" },
  { value: "Level C1", label: "C1" },
  { value: "No certificate", label: "Below C1" },
] as const;

type SortKey = "name" | "overall" | "date";
type BandValue = (typeof BAND_FILTERS)[number]["value"];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial state from URL
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    searchParams.get("group") ?? null,
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [band, setBand] = useState<BandValue>(
    (searchParams.get("band") as BandValue) ?? "all",
  );
  const [attentionFilter, setAttentionFilter] = useState(
    searchParams.get("filter") === "attention",
  );
  const [sortKey, setSortKey] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) ?? "name",
  );
  const [sortAsc, setSortAsc] = useState(
    searchParams.get("sortDir") !== "desc",
  );
  const [page, setPage] = useState(
    Number(searchParams.get("page")) || 1,
  );

  const debouncedSearch = useDebounce(search, 300);

  // Sync state → URL
  const updateUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value && value !== "all" && value !== "1" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Clean up defaults
      if (params.get("sort") === "name") params.delete("sort");
      if (params.get("sortDir") === "asc") params.delete("sortDir");
      router.replace(`/students?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // When filters change, reset to page 1 and update URL
  useEffect(() => {
    const newPage = 1;
    setPage(newPage);
    updateUrl({
      search: debouncedSearch || undefined,
      band: band !== "all" ? band : undefined,
      filter: attentionFilter ? "attention" : undefined,
      sort: sortKey !== "name" ? sortKey : undefined,
      sortDir: !sortAsc ? "desc" : undefined,
      page: undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, band, attentionFilter, sortKey, sortAsc]);

  // When page changes (but not from filter reset), update URL
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl({
      search: debouncedSearch || undefined,
      band: band !== "all" ? band : undefined,
      filter: attentionFilter ? "attention" : undefined,
      sort: sortKey !== "name" ? sortKey : undefined,
      sortDir: !sortAsc ? "desc" : undefined,
      page: newPage > 1 ? String(newPage) : undefined,
    });
  };

  const { data, isLoading } = api.score.studentList.useQuery({
    groupId: selectedGroupId ?? undefined,
    search: debouncedSearch || undefined,
    band: band !== "all" ? (band as "Grade A" | "Grade B" | "Grade C" | "Level C1" | "No certificate") : undefined,
    attention: attentionFilter || undefined,
    sort: sortKey,
    sortDir: sortAsc ? "asc" : "desc",
    page,
    pageSize: 20,
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Monitor student progress across your group"
      />

      <div className="flex flex-col gap-4">
        {/* Group filter */}
        <GroupSelector
          value={selectedGroupId}
          onChange={(id) => {
            setSelectedGroupId(id);
            setPage(1);
            updateUrl({ group: id ?? undefined, page: undefined });
          }}
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* Band pills */}
          <div className="flex items-center gap-1">
            {BAND_FILTERS.map((bf) => (
              <button
                key={bf.value}
                onClick={() => setBand(bf.value)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    band === bf.value ? "var(--primary)" : "var(--secondary)",
                  color:
                    band === bf.value ? "white" : "var(--muted-foreground)",
                }}
              >
                {bf.label}
              </button>
            ))}
          </div>

          {/* Attention toggle */}
          <button
            onClick={() => setAttentionFilter(!attentionFilter)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: attentionFilter
                ? "rgba(185,28,28,0.1)"
                : "var(--secondary)",
              color: attentionFilter
                ? "var(--destructive)"
                : "var(--muted-foreground)",
            }}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs Attention
          </button>

          {/* Count */}
          {data && (
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">
              {data.total} student{data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Sort header */}
        <div className="flex items-center gap-2 px-6 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <button
            onClick={() => handleSort("name")}
            className="flex-1 text-left hover:text-[var(--foreground)]"
          >
            Student{" "}
            {sortKey === "name" && (sortAsc ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("date")}
            className="w-16 text-left hover:text-[var(--foreground)]"
          >
            Last Exam{" "}
            {sortKey === "date" && (sortAsc ? "↑" : "↓")}
          </button>
          <span className="w-24 text-center">Skills</span>
          <button
            onClick={() => handleSort("overall")}
            className="w-20 text-right hover:text-[var(--foreground)]"
          >
            Score{" "}
            {sortKey === "overall" && (sortAsc ? "↑" : "↓")}
          </button>
          <span className="w-20 text-center">Band</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-5" />
        </div>

        {/* Student list */}
        {isLoading ? (
          <StudentListSkeleton />
        ) : !data || data.students.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-12 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {data?.total === 0 && !search && band === "all" && !attentionFilter
                ? "No students yet. Students will appear here once they join your organization."
                : "No students match your filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {data.students.map((s) => (
                <Link
                  key={s.userId}
                  href={`/students/${s.userId}`}
                  className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-3 transition-colors last:border-b-0 hover:bg-[var(--secondary)]/50"
                >
                  {/* Avatar + name */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                      <span className="text-xs font-semibold text-white">
                        {getInitials(s.name)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-[var(--foreground)]">
                        {s.name}
                      </span>
                      <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                        {s.email}
                      </span>
                    </div>
                  </div>

                  {/* Last exam date */}
                  <span className="w-16 text-xs text-[var(--muted-foreground)]">
                    {s.latest?.examDate
                      ? relativeTime(s.latest.examDate)
                      : "—"}
                  </span>

                  {/* Skill mini-bars */}
                  <div className="flex w-24 items-center justify-center gap-0.5">
                    {s.latest
                      ? SKILL_KEYS.map((key) => {
                          const score = s.latest?.scaleScores[key];
                          if (score == null)
                            return (
                              <div
                                key={key}
                                className="h-2 w-3 rounded-sm bg-[var(--secondary)]"
                              />
                            );
                          const pct = Math.max(
                            15,
                            ((score - 162) / (230 - 162)) * 100,
                          );
                          return (
                            <div
                              key={key}
                              className="w-3 overflow-hidden rounded-sm bg-[var(--secondary)]"
                              style={{ height: 16 }}
                            >
                              <div
                                className="w-full rounded-sm"
                                style={{
                                  height: `${pct}%`,
                                  backgroundColor: SKILL_COLORS[key],
                                  marginTop: `${100 - pct}%`,
                                }}
                              />
                            </div>
                          );
                        })
                      : (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          —
                        </span>
                      )}
                  </div>

                  {/* Score + trend */}
                  <div className="flex w-20 items-center justify-end gap-1.5">
                    {s.latest ? (
                      <>
                        <span className="text-sm font-bold text-[var(--foreground)]">
                          {s.latest.overall}
                        </span>
                        {s.delta != null && (
                          <span
                            className="flex items-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor:
                                s.delta >= 0
                                  ? "rgba(5,150,105,0.1)"
                                  : "rgba(185,28,28,0.1)",
                              color:
                                s.delta >= 0
                                  ? "var(--band-grade-a)"
                                  : "var(--destructive)",
                            }}
                          >
                            {s.delta >= 0 ? (
                              <TrendingUp className="h-2.5 w-2.5" />
                            ) : (
                              <TrendingDown className="h-2.5 w-2.5" />
                            )}
                            {s.delta >= 0 ? "+" : ""}
                            {s.delta}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        —
                      </span>
                    )}
                  </div>

                  {/* Band */}
                  <div className="w-20 text-center">
                    {s.latest ? (
                      <BandBadge label={s.latest.band.label} />
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        —
                      </span>
                    )}
                  </div>

                  {/* Attention tag */}
                  <div className="w-24 text-center">
                    {s.attention ? (
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor:
                            REASON_CONFIG[s.attention.reason as AttentionReason]
                              .bg,
                          color:
                            REASON_CONFIG[s.attention.reason as AttentionReason]
                              .text,
                        }}
                      >
                        {REASON_CONFIG[s.attention.reason as AttentionReason].label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        OK
                      </span>
                    )}
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-[var(--muted-foreground)]">
                  Showing {(data.page - 1) * data.pageSize + 1}–
                  {Math.min(data.page * data.pageSize, data.total)} of{" "}
                  {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-full bg-[var(--secondary)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </button>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= data.totalPages}
                    className="flex items-center gap-1 rounded-full bg-[var(--secondary)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
