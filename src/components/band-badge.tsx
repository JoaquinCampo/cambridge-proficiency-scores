import { cn } from "~/lib/utils";

const bandConfig: Record<
  string,
  { bg: string; text: string }
> = {
  "Grade A": { bg: "rgba(5,150,105,0.1)", text: "var(--band-grade-a)" },
  "Grade B": { bg: "rgba(67,56,202,0.1)", text: "var(--band-grade-b)" },
  "Grade C": { bg: "rgba(124,58,237,0.1)", text: "var(--band-grade-c)" },
  "Level C1": { bg: "rgba(217,119,6,0.1)", text: "var(--band-c1)" },
  "No certificate": { bg: "rgba(161,161,170,0.1)", text: "var(--band-below-c1)" },
  "Not reported": { bg: "rgba(161,161,170,0.1)", text: "var(--band-below-c1)" },
};

export function BandBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const config = bandConfig[label] ?? bandConfig["Not reported"]!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {label}
    </span>
  );
}
