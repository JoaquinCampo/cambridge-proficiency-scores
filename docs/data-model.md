# Data Model

## Overview

The database lives on **Neon** (PostgreSQL) and is managed via **Prisma**. Clerk handles auth, roles, and organizations — we store only what's needed for querying scores.

## Tables

### User

Mirrors essential Clerk user data for foreign key relationships.

| Column    | Type     | Notes                          |
| --------- | -------- | ------------------------------ |
| clerkId   | String   | **PK** — Clerk's user ID      |
| email     | String   | Unique                         |
| name      | String?  | Display name from Clerk        |
| createdAt | DateTime | Auto-set on creation           |
| updatedAt | DateTime | Auto-updated                   |

- No `role` column — roles live in Clerk metadata.
- Synced from Clerk via webhooks or on first login.

### ScoreLog

One row per exam attempt. A student can enter all 5 skills, some, or just one.

| Column         | Type     | Notes                                   |
| -------------- | -------- | --------------------------------------- |
| id             | String   | PK (cuid)                               |
| userId         | String   | FK → User.clerkId                       |
| organizationId | String   | Clerk Organization ID (the group)       |
| examDate       | DateTime | When the exam was taken                 |
| reading        | Int?     | Raw score 0–44. NULL = not entered.     |
| useOfEnglish   | Int?     | Raw score 0–28. NULL = not entered.     |
| writing        | Int?     | Raw score 0–40. NULL = not entered.     |
| listening      | Int?     | Raw score 0–30. NULL = not entered.     |
| speaking       | Float?   | Raw score 0–75 (halves allowed). NULL = not entered. |
| notes          | String?  | Optional free-text notes                |
| createdAt      | DateTime | When the log was created                |
| updatedAt      | DateTime | Auto-updated                            |

- **NULL vs 0**: NULL means the student didn't enter that skill. 0 means they scored zero.
- `organizationId` ties the score to the group/course context.
- `examDate` is the date the student says they took the exam (may differ from `createdAt`).

## Indexes

- `ScoreLog(userId)` — fast lookups for a student's history.
- `ScoreLog(organizationId)` — fast lookups for all scores in a group.
- `ScoreLog(userId, examDate)` — ordered progress queries.

## Scoring Logic (computed, not stored)

Scale scores are **computed at query time** using the existing `src/lib/scoring.ts` logic:

- **Cambridge Scale score**: `estimateScaleScore(component, rawScore)` — anchor-point interpolation. Range: 162–230.
- **Overall score**: Average of available scale scores via `calculateOverallScore()`.
- **Band**: `getOverallBand(overallScore)` — Grade A/B/C, C1, or Below C1.

Charts display Cambridge Scale scores (not percentages).

### Component Max Raw Scores

| Component      | Max Raw |
| -------------- | ------- |
| Reading        | 44      |
| Use of English | 28      |
| Writing        | 40      |
| Listening      | 30      |
| Speaking       | 75      |
