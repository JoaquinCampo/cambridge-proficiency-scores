"use client";

import { api } from "~/trpc/react";

export function GroupSelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (groupId: string | null) => void;
}) {
  const { data: groups } = api.group.list.useQuery();

  if (!groups || groups.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
        style={{
          backgroundColor:
            value === null ? "rgba(67,56,202,0.1)" : "var(--secondary)",
          color: value === null ? "var(--primary)" : "var(--muted-foreground)",
          boxShadow: value === null ? "inset 0 0 0 1px rgba(67,56,202,0.2)" : "none",
          transitionDuration: "var(--transition-fast)",
        }}
      >
        All Students
      </button>
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onChange(group.id)}
          className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
          style={{
            backgroundColor:
              value === group.id ? "rgba(67,56,202,0.1)" : "var(--secondary)",
            color: value === group.id ? "var(--primary)" : "var(--muted-foreground)",
            boxShadow: value === group.id ? "inset 0 0 0 1px rgba(67,56,202,0.2)" : "none",
            transitionDuration: "var(--transition-fast)",
          }}
        >
          {group.name}
          <span className="ml-1 opacity-60">{group.activeMembers}</span>
        </button>
      ))}
    </div>
  );
}
