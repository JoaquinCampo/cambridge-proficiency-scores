# Groups System — Design Document

## Context

Teachers manage multiple classes (groups). Students belong to one active group at a time but may have historical memberships. Currently the system uses Clerk Organizations as the tenant boundary (one org per teacher/school), with no group concept.

This design adds **app-level groups within a Clerk organization**, avoiding Clerk's per-org pricing constraints.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where do groups live? | App database (not Clerk orgs) | Clerk org limits are expensive. One Clerk org = one teacher/school. Groups are local. |
| Do scores belong to a group? | **Yes** — `ScoreLog.groupId` | A student moving from Group A to Group B needs their old scores to remain in Group A's dashboard. Scores are stamped with the active group at creation time. |
| Can a student be in multiple groups? | One **active** group at a time | Historical memberships are preserved (active=false). A student's past data stays queryable in old groups. |
| Can a student without a group log scores? | **No** | Teacher must assign the student to a group first. Prevents orphaned scores. |
| Can students edit/delete scores from a previous group? | **No** | Once a student leaves a group, those scores are locked. Only scores in the active group are editable. |
| "All Students" view for teachers? | **Yes** | Teachers can view an org-wide aggregate across all groups as a convenience. |
| How do we know who's in the org? | Query Clerk API at runtime | For the management page only. Not a hot path. Avoids syncing a separate OrgMember table. |

## Data Model

### New: Group

A class or course created by a teacher within their Clerk organization.

| Column         | Type     | Notes                                  |
|----------------|----------|----------------------------------------|
| id             | String   | PK (cuid)                              |
| name           | String   | e.g. "Proficiency Monday 2026"         |
| organizationId | String   | Clerk org ID — the tenant boundary     |
| createdAt      | DateTime | Auto-set                               |
| updatedAt      | DateTime | Auto-updated                           |

Indexes: `[organizationId]`

### New: GroupMember

Tracks which students belong to which groups, with an active/inactive state for history.

| Column   | Type      | Notes                                           |
|----------|-----------|-------------------------------------------------|
| id       | String    | PK (cuid)                                       |
| groupId  | String    | FK → Group                                      |
| userId   | String    | FK → User.clerkId                               |
| active   | Boolean   | Only ONE active membership per user per org      |
| joinedAt | DateTime  | When the student was added to this group         |
| leftAt   | DateTime? | Set when deactivated (moved to another group)    |

Constraints:
- `@@unique([groupId, userId])` — a student can only appear once per group
- `@@index([userId, active])` — fast lookup of a student's active group
- `@@index([groupId])` — fast listing of group members

**Invariant**: At most one `GroupMember` row per `userId` within the same `organizationId` can have `active = true`. Enforced in application logic within a transaction.

### Modified: ScoreLog

| Column  | Type    | Notes                                           |
|---------|---------|-------------------------------------------------|
| groupId | String? | FK → Group. Nullable for backward compat with existing data. Required for new scores going forward. |

New index: `[groupId]`

### Modified: User

Add relation:

```
groupMemberships GroupMember[]
```

### Prisma Schema (new/changed models)

```prisma
model Group {
  id             String        @id @default(cuid())
  name           String
  organizationId String
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  members        GroupMember[]
  scores         ScoreLog[]

  @@index([organizationId])
}

model GroupMember {
  id       String    @id @default(cuid())
  groupId  String
  userId   String
  active   Boolean   @default(true)
  joinedAt DateTime  @default(now())
  leftAt   DateTime?

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [clerkId], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([userId, active])
  @@index([groupId])
}

// ScoreLog — add:
//   groupId String?
//   group   Group?  @relation(fields: [groupId], references: [id], onDelete: SetNull)
//   @@index([groupId])

// User — add:
//   groupMemberships GroupMember[]
```

## Lifecycle Flows

### 1. Teacher invites a student

```
Teacher enters student email on management page
  → tRPC `user.invite` calls clerk.organizations.createInvitation({
      emailAddress, organizationId, role: "basic_member"
    })
  → Student receives email from Clerk
  → Student clicks link → Clerk sign-up/sign-in
  → Student lands on /no-group → accepts org invitation
  → Student is now in the org but UNGROUPED (no GroupMember)
  → Student sees "no group" page: "Your teacher will assign you to a group"
```

### 2. Teacher assigns student to a group

```
Teacher opens group management page
  → Sees list of ungrouped students (org members without active GroupMember)
  → Assigns student to "Proficiency Monday 2026"
  → tRPC `group.addMember`:
      1. Check no other active membership in this org
      2. Create GroupMember { groupId, userId, active: true, joinedAt: now }
  → Student can now log scores (stamped with this groupId)
```

### 3. Student logs a score

```
Student opens score entry form
  → Backend: look up active GroupMember for ctx.userId in ctx.orgId
  → If no active group → reject with error
  → Create ScoreLog with {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      groupId: activeGroup.id,
      ...scoreData
    }
```

### 4. Student moves groups (next year, different level)

```
Teacher moves student from "Proficiency 2025" to "Proficiency 2026"
  → tRPC `group.moveMember` (transaction):
      1. Old membership: active = false, leftAt = now
      2. Upsert new membership: active = true, joinedAt = now
  → Old scores keep groupId = proficiency2025 (immutable)
  → New scores get groupId = proficiency2026
```

### 5. Student edits/deletes a score

```
Student requests update/delete on a ScoreLog
  → Backend checks:
      1. Score belongs to this student (userId match)
      2. Score's groupId matches student's ACTIVE group
      → If not (score is from a previous group) → reject
  → Proceed with update/delete
```

### 6. Teacher views group dashboard

```
Teacher selects "Proficiency Monday 2026" from group dropdown
  → tRPC `score.dashboard` with { groupId: "..." }
  → Query: ScoreLog WHERE groupId = input.groupId
  → Returns stats, charts, attention flags scoped to this group
```

### 7. Teacher views "All Students"

```
Teacher selects "All Students" (no group filter)
  → tRPC `score.dashboard` with no groupId
  → Query: ScoreLog WHERE organizationId = ctx.orgId (same as today)
  → Returns org-wide aggregate
```

## Query Changes

### Teacher queries — add optional groupId filter

All teacher queries that currently filter by `organizationId = ctx.orgId` gain an optional `groupId` input:

```typescript
// If groupId provided:
WHERE organizationId = ctx.orgId AND groupId = input.groupId

// If groupId omitted (All Students):
WHERE organizationId = ctx.orgId
```

Affected procedures:
- `score.dashboard`
- `score.studentList`
- `score.latestByStudent`
- `score.studentProgress` (verify student is in the specified group)
- `score.classStats`

### Student queries — no changes for listing

- `score.list` — student sees ALL their scores (across all groups, all history)
- `score.progress` — same, full history

### Student mutations — enforce active group

- `score.create` — stamp with active groupId, reject if no active group
- `score.update` — reject if score's groupId ≠ active groupId
- `score.delete` — reject if score's groupId ≠ active groupId

## New tRPC Router: `group`

| Procedure | Type | Auth | Input | Description |
|-----------|------|------|-------|-------------|
| `group.create` | mutation | teacherProcedure | `{ name }` | Create group in ctx.orgId |
| `group.list` | query | teacherProcedure | — | List all groups in ctx.orgId with member counts |
| `group.update` | mutation | teacherProcedure | `{ id, name }` | Rename a group |
| `group.delete` | mutation | teacherProcedure | `{ id }` | Delete group + cascade members. Scores keep orphaned groupId. |
| `group.members` | query | teacherProcedure | `{ groupId, activeOnly? }` | List members of a group |
| `group.addMember` | mutation | teacherProcedure | `{ groupId, userId }` | Add student to group (must have no other active membership in org) |
| `group.removeMember` | mutation | teacherProcedure | `{ groupId, userId }` | Deactivate membership (set active=false, leftAt=now) |
| `group.moveMember` | mutation | teacherProcedure | `{ userId, fromGroupId, toGroupId }` | Move student between groups (transaction) |

## Updated tRPC Router: `user`

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `user.invite` | mutation | teacherProcedure | Invite email to ctx.orgId via Clerk API |
| `user.orgMembers` | query | teacherProcedure | List all org members via Clerk API, annotated with group assignment status |

## Webhook Additions

Handle `organizationMembership.deleted`:
- When a student is removed from the org (via Clerk dashboard or API)
- Deactivate all their GroupMember records in that org
- Their historical scores remain (scores are never deleted by membership changes)

## UI Changes

### Group management page (new, teacher-only)

- List all groups with member counts
- Create / rename / delete groups
- Per-group: list members, add/remove/move students
- "Ungrouped" section: org members without an active group
- "Invite Student" button: enter email → Clerk invitation

### Dashboard + Students pages (modified)

- Add group selector dropdown at the top
- Options: "All Students" + each group
- Selected group filters all data on the page
- Could be a query param (`?group=abc123`) for bookmarkability

### Navigation (modified)

- Add "Groups" link for teachers (to group management page)

### No-group page (modified)

- After accepting org invitation, if no active group:
  - Show: "You've joined [org name]. Your teacher will assign you to a group."
  - No score entry allowed until assigned

### Student score entry (modified)

- If student has no active group → show message instead of form
- Otherwise: form works exactly as before (groupId stamped automatically)

## Migration Strategy

1. Add `Group` and `GroupMember` tables (new migration)
2. Add `groupId` column to `ScoreLog` as nullable (new migration)
3. Existing scores have `groupId = NULL` — they still appear in "All Students" views
4. Optionally: create a "Legacy" group per org and backfill existing scores (can be done later)
5. New scores require a groupId (enforced in application logic, not DB constraint, since column is nullable)

## What Stays the Same

- Clerk Organizations = tenant boundary (one per teacher/school)
- Clerk handles auth, sign-in, sign-up, org invitations
- Roles in Clerk publicMetadata (teacher/student)
- Middleware: org check → redirect to /no-group
- ScoreLog raw → scale score enrichment at query time
- Student progress/history views (students see all their scores)
- Scoring logic (`src/lib/scoring.ts`) — untouched
- Attention logic (`src/lib/attention.ts`) — untouched (receives filtered data)
