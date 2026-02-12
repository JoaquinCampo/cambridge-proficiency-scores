# Backend — Component Breakdown

Every backend component, what it does, where it lives, and what changes from the current codebase.

---

## 1. Authentication (Clerk)

### What changes

The entire NextAuth system is replaced by Clerk. This affects auth config, middleware, session access, and the sign-in UI.

### Files to DELETE

| File | Why |
| --- | --- |
| `src/server/auth/config.ts` | NextAuth config with CredentialsProvider |
| `src/server/auth/index.ts` | NextAuth exports (auth, handlers, signIn, signOut) |
| `src/lib/auth.ts` | Login code generation/verification (createLoginCode, verifyLoginCode) |
| `src/lib/auth-email.ts` | Auth email template builder |
| `src/lib/auth.test.ts` | Tests for login code logic |
| `src/lib/auth-email.test.ts` | Tests for auth email template |
| `src/app/(auth)/sign-in/page.tsx` | Custom sign-in page |
| `src/app/(auth)/sign-in/_components/sign-in-form.tsx` | Custom sign-in form |
| `src/app/api/auth/request-code/route.ts` | Email code request endpoint |

### Files to CREATE

| File | Purpose |
| --- | --- |
| `src/middleware.ts` | Clerk middleware — protects routes, makes auth available |

**`src/middleware.ts`** — Uses `clerkMiddleware()` from `@clerk/nextjs/server`. Protects all routes under `(app)`. Public routes: sign-in, sign-up, api/webhooks.

### Files to MODIFY

| File | Change |
| --- | --- |
| `src/app/layout.tsx` | Wrap with `<ClerkProvider>` from `@clerk/nextjs` |
| `src/app/(app)/layout.tsx` | Remove NextAuth `auth()` check — Clerk middleware handles this now. Can still use `currentUser()` or `auth()` from `@clerk/nextjs/server` if needed for role checks. |
| `src/env.js` | Remove `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`. |
| `next.config.js` | No changes needed — Clerk doesn't require Next.js config changes. |

### How auth works at runtime

1. `clerkMiddleware()` in `src/middleware.ts` runs on every request.
2. It attaches auth state to the request. Protected routes redirect unauthenticated users to Clerk's sign-in page.
3. In Server Components: `auth()` from `@clerk/nextjs/server` returns `{ userId, orgId, orgRole, ... }`.
4. In Client Components: `useUser()`, `useAuth()`, `useOrganization()` hooks.
5. In tRPC context: `auth()` is called and attached to context so procedures can access `ctx.userId`, `ctx.orgId`.

### Roles

- Stored in Clerk `publicMetadata`: `{ role: "student" | "teacher" }`.
- Accessed via `auth().sessionClaims.metadata.role` in server, or `useUser().publicMetadata.role` in client.
- No role column in our DB — Clerk is the source of truth.

### Organizations

- Clerk Organizations = groups/courses.
- A user belongs to one or more orgs.
- Active org is set via Clerk's org switcher or `useOrganization()`.
- `auth().orgId` gives the currently active org ID.

---

## 2. Database (Neon + Prisma)

### What changes

- Connection string changes from local PostgreSQL to Neon.
- Schema is rewritten: old NextAuth models removed, new User + ScoreLog models added.

### Files to MODIFY

**`prisma/schema.prisma`** — Full rewrite:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
}

model User {
  clerkId   String     @id
  email     String     @unique
  name      String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  scores    ScoreLog[]
}

model ScoreLog {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  examDate       DateTime
  reading        Int?
  useOfEnglish   Int?
  writing        Int?
  listening      Int?
  speaking       Float?
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [clerkId], onDelete: Cascade)

  @@index([userId])
  @@index([organizationId])
  @@index([userId, examDate])
}
```

Models REMOVED from current schema: `Account`, `Session`, `VerificationToken`, `LoginCode` — all were NextAuth-specific.

**`src/server/db.ts`** — No changes needed. Singleton PrismaClient pattern stays the same. Neon is just a different connection string.

**`src/env.js`** — `DATABASE_URL` stays but will point to Neon (`postgresql://...@ep-xxx.us-east-2.aws.neon.tech/...?sslmode=require`).

### Migrations

After updating the schema, run `npx prisma migrate dev` to create the migration. This will drop the old tables and create the new ones. Since we're switching to a fresh Neon DB, there's no data to migrate.

---

## 3. tRPC — Context & Middleware

### What changes

The tRPC context needs Clerk auth info. We add authenticated and role-based middleware.

### Files to MODIFY

**`src/server/api/trpc.ts`** — This is the core tRPC setup. Changes:

1. **Context**: Add Clerk auth to context.

```typescript
import { auth } from "@clerk/nextjs/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const clerkAuth = await auth();
  return {
    ...opts,
    db,               // Prisma client
    userId: clerkAuth.userId,
    orgId: clerkAuth.orgId,
  };
};
```

2. **Authenticated procedure**: Middleware that enforces `ctx.userId` is present.

```typescript
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const protectedProcedure = t.procedure.use(timingMiddleware).use(enforceAuth);
```

3. **Teacher procedure**: Middleware that enforces teacher role (checks Clerk metadata).

```typescript
const enforceTeacher = t.middleware(async ({ ctx, next }) => {
  // Fetch user's role from Clerk sessionClaims or clerkClient
  if (role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const teacherProcedure = protectedProcedure.use(enforceTeacher);
```

**`src/trpc/server.ts`** — Minor update: context creation might need to pass Clerk headers. Should work as-is since `auth()` from Clerk reads from the request automatically in Server Components.

**`src/trpc/react.tsx`** — No changes needed. The client-side tRPC setup stays the same.

**`src/trpc/query-client.ts`** — No changes needed.

---

## 4. tRPC Routers

### What changes

Delete the boilerplate `post` router. Create real routers for scores and users.

### Files to DELETE

| File | Why |
| --- | --- |
| `src/server/api/routers/post.ts` | Boilerplate, not used |

### Files to CREATE

**`src/server/api/routers/score.ts`** — Score CRUD and progress queries.

Procedures:

| Procedure | Type | Auth | Description |
| --- | --- | --- | --- |
| `score.create` | mutation | protectedProcedure | Student logs a new exam score. Validates raw scores against maxRaw per component. Inserts into ScoreLog with userId from ctx and organizationId from ctx.orgId. |
| `score.list` | query | protectedProcedure | Returns the current user's score history, ordered by examDate desc. Used for the score history list. |
| `score.progress` | query | protectedProcedure | Returns the current user's scores ordered by examDate asc, with computed scale scores. Used for charts. |
| `score.update` | mutation | protectedProcedure | Student edits a past score entry. Must own the score (userId check). |
| `score.delete` | mutation | protectedProcedure | Student deletes a score entry. Must own the score. |
| `score.studentProgress` | query | teacherProcedure | Teacher views a specific student's progress. Takes studentId as input. Validates teacher has access to the student's org. |

Input validation (Zod schemas):

```typescript
const createScoreInput = z.object({
  examDate: z.date(),
  reading: z.number().int().min(0).max(44).nullable(),
  useOfEnglish: z.number().int().min(0).max(28).nullable(),
  writing: z.number().int().min(0).max(40).nullable(),
  listening: z.number().int().min(0).max(30).nullable(),
  speaking: z.number().min(0).max(75).refine(v => v === null || v % 0.5 === 0, { message: "Speaking allows halves" }).nullable(),
  notes: z.string().max(500).optional(),
});
```

Scale score computation happens **in the router response**, not in the DB. When returning scores, each row is enriched:

```typescript
// For each score log entry:
const enriched = {
  ...scoreLog,
  scaleScores: {
    reading: scoreLog.reading != null ? estimateScaleScore("reading", scoreLog.reading) : null,
    // ... same for all 5 components
  },
  overall: calculateOverallScore(scaleScores),
  band: getOverallBand(overall),
};
```

**`src/server/api/routers/user.ts`** — User/student management for teachers.

Procedures:

| Procedure | Type | Auth | Description |
| --- | --- | --- | --- |
| `user.list` | query | teacherProcedure | Lists all students in the teacher's active organization. Joins User table filtered by organizationId from score logs, or queries Clerk org members. |
| `user.get` | query | teacherProcedure | Gets a single student's profile info. |
| `user.sync` | mutation | protectedProcedure | Upserts the current user's info from Clerk into our DB. Called on first login or profile update. |

### Files to MODIFY

**`src/server/api/root.ts`** — Replace post router with new routers:

```typescript
import { scoreRouter } from "./routers/score";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  score: scoreRouter,
  user: userRouter,
});
```

---

## 5. Clerk Webhook (User Sync)

### Why

When a user signs up or updates their profile in Clerk, we need to sync their data to our `User` table so we can do DB joins with `ScoreLog`.

### Files to CREATE

**`src/app/api/webhooks/clerk/route.ts`** — Webhook handler.

Handles these Clerk events:

| Event | Action |
| --- | --- |
| `user.created` | Insert new User row (clerkId, email, name) |
| `user.updated` | Update User row (email, name changes) |
| `user.deleted` | Delete User row (cascades to ScoreLog) |

Implementation:
1. Verify webhook signature using `svix` (Clerk uses Svix for webhook delivery).
2. Parse the event type and payload.
3. Upsert/delete in our DB via Prisma.

Dependencies: `svix` package for signature verification.

### Alternative: Lazy sync

Instead of webhooks, sync on first tRPC call: if `ctx.userId` has no User row, create one by fetching from Clerk API. Trade-off: simpler (no webhook), but adds latency to first request and doesn't catch profile updates or deletions.

**Recommendation**: Use webhooks. It's the standard Clerk pattern and keeps data consistent.

---

## 6. Scoring Logic

### What changes

Nothing. `src/lib/scoring.ts` stays exactly as-is.

### How it's used

- **`estimateScaleScore(component, rawScore)`** — Called in tRPC score router when returning score data to the client. Converts raw marks to Cambridge Scale (162–230).
- **`calculateOverallScore(scaleScoreMap)`** — Averages available scale scores for an exam entry.
- **`getOverallBand(overall)`** — Classifies into Grade A/B/C, C1, Below C1.
- **`C2_COMPONENTS`** — Used for validation (maxRaw values) and labels.

### Where it runs

Server-side only (in tRPC procedures). The client receives pre-computed scale scores — no scoring logic on the client.

---

## 7. API Routes

### Files to DELETE

| File | Why |
| --- | --- |
| `src/app/api/send-results/route.ts` | Email results flow removed |
| `src/app/api/auth/request-code/route.ts` | NextAuth email code flow removed |

### Files to KEEP

| File | Why |
| --- | --- |
| `src/app/api/trpc/[trpc]/route.ts` | tRPC HTTP handler — stays as-is, just needs the updated context |

### Files to CREATE

| File | Why |
| --- | --- |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook for user sync (see section 5) |

---

## 8. Environment Variables

### File: `src/env.js`

**Remove:**

| Variable | Why |
| --- | --- |
| `AUTH_SECRET` | NextAuth secret |
| `AUTH_URL` | NextAuth URL |
| `NEXTAUTH_SECRET` | NextAuth legacy |
| `NEXTAUTH_URL` | NextAuth legacy |
| `RESEND_API_KEY` | Email sending removed |
| `EMAIL_FROM` | Email sending removed |
| `EMAIL_TO` | Email sending removed |
| `EMAIL_PASSWORD` | Email sending removed |

**Keep:**

| Variable | Notes |
| --- | --- |
| `NODE_ENV` | Standard |
| `DATABASE_URL` | Points to Neon now |

**Add:**

| Variable | Side | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | Clerk publishable key |
| `CLERK_SECRET_KEY` | server | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | server | For verifying webhook signatures |

---

## 9. Dependencies

### Remove

| Package | Why |
| --- | --- |
| `next-auth` | Replaced by Clerk |
| `@auth/prisma-adapter` | NextAuth adapter |
| `resend` | Email sending removed |

### Add

| Package | Why |
| --- | --- |
| `@clerk/nextjs` | Clerk SDK for Next.js (auth, middleware, components, hooks) |
| `svix` | Webhook signature verification for Clerk webhooks |
| `recharts` | Charts (client-side, added when building UI) |

### Keep

Everything else stays: `@prisma/client`, `prisma`, `@trpc/*`, `@tanstack/react-query`, `zod`, `superjson`, `next`, `react`, `react-dom`, shadcn deps, Tailwind, testing deps.

---

## 10. Files Unrelated to Backend (Removed Separately)

These aren't backend components but will be removed as part of the cleanup:

| File/Dir | Why |
| --- | --- |
| `src/remotion/` | Remotion removed |
| `src/app/_components/ScoreApp.tsx` | Old examiner UI |
| `src/app/_components/ScoreApp.test.tsx` | Tests for old UI |
| `src/lib/email.ts` | Results email builder |
| `src/lib/email.test.ts` | Tests for email builder |
| `src/app/(app)/animations/` | Remotion player page |

---

## Summary: File Map

```
src/
├── app/
│   ├── layout.tsx                          # MODIFY — add ClerkProvider
│   ├── (app)/
│   │   ├── layout.tsx                      # MODIFY — Clerk auth guard
│   │   └── page.tsx                        # MODIFY later (new UI)
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts            # KEEP
│   │   └── webhooks/clerk/route.ts         # CREATE — Clerk webhook
│   └── (auth)/                             # DELETE — Clerk handles sign-in
├── middleware.ts                            # CREATE — Clerk middleware
├── server/
│   ├── db.ts                               # KEEP
│   ├── api/
│   │   ├── trpc.ts                         # MODIFY — Clerk context + auth middleware
│   │   ├── root.ts                         # MODIFY — new routers
│   │   └── routers/
│   │       ├── score.ts                    # CREATE — score CRUD + progress
│   │       └── user.ts                     # CREATE — user management
│   └── auth/                               # DELETE — NextAuth
├── lib/
│   ├── scoring.ts                          # KEEP — untouched
│   ├── scoring.test.ts                     # KEEP
│   └── utils.ts                            # KEEP
├── trpc/
│   ├── react.tsx                           # KEEP
│   ├── server.ts                           # KEEP (minor tweak possible)
│   └── query-client.ts                     # KEEP
├── env.js                                  # MODIFY — new Clerk vars
└── styles/globals.css                      # KEEP
```
