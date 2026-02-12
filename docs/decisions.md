# Decisions

Architectural and technical decisions made during planning.

## Auth: Clerk (replaces NextAuth)

- **Why**: Client wants Google sign-in. Clerk provides Google OAuth, organizations (for groups), and role metadata out of the box.
- **Organizations**: Clerk Organizations model courses/groups. Access to the app requires membership in at least one org.
- **Roles**: Stored in Clerk user `publicMetadata` as `{ role: "student" | "teacher" }`. Not duplicated in our DB.
- **What's removed**: NextAuth v5, email magic-link flow, LoginCode model, `src/server/auth/`, `src/lib/auth.ts`, `src/lib/auth-email.ts`, `src/app/(auth)/sign-in/`.

## Database: Neon (replaces local PostgreSQL)

- **Why**: Serverless PostgreSQL, good DX, free tier, works with Prisma.
- **Migration**: Update `DATABASE_URL` in env to Neon connection string. Prisma schema stays as the source of truth.
- **What changes**: Connection string only. Prisma adapter and client code remain the same.

## User IDs: Clerk ID as Primary Key

- **Why**: Avoids an extra lookup/mapping layer. Clerk IDs are stable strings.
- **Trade-off**: Our User table is a thin mirror of Clerk data, synced on login or via webhook.

## API: Keep tRPC

- **Why**: Typed end-to-end API is valuable as the app grows. Already set up.
- **Alternative considered**: Server Actions — simpler but less structured for multiple query patterns.

## Score Storage: NULLs for Unentered Fields

- **Why**: Distinguishes "didn't enter this skill" from "scored 0". Important for accurate percentage calculations (don't count NULL skills in averages).

## Scoring: Keep Existing Logic

- **What's kept**: `src/lib/scoring.ts` — raw→scale conversion, band classification, overall score calculation.
- **Charts use Cambridge Scale scores** (162–230), not percentages. This is the standard C2 metric.

## Charts: Recharts

- **Why**: Most popular React charting library. Declarative API, good for line/bar charts, responsive.

## Removed

| What                    | Why                                              |
| ----------------------- | ------------------------------------------------ |
| Remotion                | Not needed for progress tracking                 |
| ScoreApp.tsx            | Examiner flow replaced by student self-entry     |
| Email results flow      | No longer sending score emails                   |
| NextAuth + magic link   | Replaced by Clerk                                |
| `src/app/api/send-results/` | No longer needed                            |
| `src/app/api/auth/request-code/` | Replaced by Clerk                      |
