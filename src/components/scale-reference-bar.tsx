const segments = [
  { label: "Below C1", range: "162", color: "var(--band-below-c1)", width: "26.5%" },
  { label: "Level C1", range: "180", color: "var(--band-c1)", width: "29.4%" },
  { label: "Grade C", range: "200", color: "var(--band-grade-c)", width: "19.1%" },
  { label: "Grade B", range: "213", color: "var(--band-grade-b)", width: "10.3%" },
  { label: "Grade A", range: "220", color: "var(--band-grade-a)", width: "14.7%" },
];

export function ScaleReferenceBar() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-[var(--muted-foreground)]">
        Cambridge Scale Reference
      </span>
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="h-full"
            style={{ width: seg.width, backgroundColor: seg.color }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
        <span>162</span>
        <span>180</span>
        <span>200</span>
        <span>213</span>
        <span>220</span>
        <span>230</span>
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
        <span>Below C1</span>
        <span>Level C1</span>
        <span>Grade C</span>
        <span>Grade B</span>
        <span>Grade A</span>
      </div>
    </div>
  );
}
