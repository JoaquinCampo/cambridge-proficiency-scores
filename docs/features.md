# Features

## Roles

### Student

1. **Sign in** with Google via Clerk.
2. **Enter exam scores** — log raw marks for one or more of the 5 skills per exam attempt. Specify the exam date.
3. **View own progress** — charts showing improvement over time:
   - **Overall progress**: Line chart. X-axis = time, Y-axis = exam percentage (0–100%).
   - **Per-skill breakdown**: Each of the 5 skills plotted over time (line or bar chart).
4. **See score history** — list of past exam entries with raw scores, scale scores, percentages, and band.

### Teacher

1. **Sign in** with Google via Clerk.
2. **See student list** — all students in their assigned groups/organizations.
3. **View individual student progress** — same charts as the student sees, possibly with additional insight.
4. **Dashboard** — aggregate metrics across students in a group (details TBD in a later iteration).

## Charts

| Chart              | Type       | X-axis | Y-axis        | Data                                        |
| ------------------ | ---------- | ------ | ------------- | ------------------------------------------- |
| Overall progress   | Line chart | Time   | 162–230 scale | Average Cambridge Scale across entered skills |
| Per-skill progress | Line/Bar   | Time   | 162–230 scale | Individual skill scale scores (5 series)     |

- Library: **Recharts**.
- Scale scores computed via `estimateScaleScore(component, rawScore)` from `src/lib/scoring.ts`.
- Overall = average of available scale scores for that exam entry.

## Score Entry

- Student selects exam date and enters raw marks.
- Can enter all 5, some, or just 1 skill — unentered fields are NULL.
- Validation: each score must be within 0–maxRaw for its component. Speaking allows half marks (0.5 increments).
- Existing validation logic in `ScoreApp.tsx` can be reused/adapted.

## UI

- UI design is **deferred** to later iterations.
- Current dark theme and shadcn/ui components will be the foundation.
- Pages to build (structure only, design later):
  - `/` — Landing/welcome after login
  - `/scores` — Score entry + history (student)
  - `/progress` — Progress charts (student)
  - `/students` — Student list (teacher)
  - `/students/[id]` — Individual student progress (teacher)
  - `/dashboard` — Group metrics (teacher)
