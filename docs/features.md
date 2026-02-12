# Features

## Roles

### Student

1. **Sign in** with Google via Clerk.
2. **Accept organization invitation** — join teacher's org from the /no-group page.
3. **Wait for group assignment** — cannot log scores until assigned to a group by the teacher.
4. **Enter exam scores** — log raw marks for one or more of the 5 skills per exam attempt. Specify the exam date. Scores are stamped with the student's active group.
5. **View own progress** — charts showing improvement over time (all history, across all groups):
   - **Overall progress**: Line chart. X-axis = time, Y-axis = Cambridge Scale (162–230).
   - **Per-skill breakdown**: Each of the 5 skills plotted over time (line or bar chart).
6. **See score history** — list of past exam entries with raw scores, scale scores, and band.
7. **Edit/delete only active group scores** — scores from previous groups are locked.

### Teacher

1. **Sign in** with Google via Clerk.
2. **Manage groups** — create, rename, delete groups within their organization.
3. **Invite students** — send email invitations to join the organization via Clerk.
4. **Assign students to groups** — place ungrouped students into a group; move students between groups.
5. **See student list** — all students in a group or across all groups, with filtering/sorting.
6. **View individual student progress** — same charts as the student sees, with teacher-level context.
7. **Dashboard** — aggregate metrics for a selected group or all students (band distribution, class average, attention flags, skill averages, progress over time).
8. **Group switching** — dropdown to switch between groups on dashboard and student list pages. "All Students" shows org-wide data.

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
  - `/` — Landing/welcome after login (students: score entry + history)
  - `/progress` — Progress charts (student)
  - `/dashboard` — Group metrics with group selector dropdown (teacher)
  - `/students` — Student list with group filter (teacher)
  - `/students/[id]` — Individual student progress (teacher)
  - `/groups` — Group management: CRUD groups, assign students, invite (teacher)
  - `/no-group` — Shown to authenticated users without an org or without an active group
