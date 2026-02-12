# Architecture

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 15 (App Router, Turbopack)  |
| UI             | React 19, Tailwind CSS 4, shadcn/ui |
| Auth           | Clerk (Google sign-in, orgs, roles) |
| Database       | Neon (PostgreSQL)                   |
| ORM            | Prisma                              |
| API            | tRPC                                |
| Validation     | Zod                                 |
| Testing        | Vitest + Testing Library            |

## Authentication & Authorization

- **Provider**: Clerk replaces NextAuth entirely.
- **Sign-in method**: Google OAuth (students and teachers sign in with their Google accounts).
- **Access control**: A user can access the app if they belong to at least one Clerk Organization.
- **Roles**: Stored in Clerk user metadata — either `student` or `teacher`. Not stored in our database.
- **Organizations**: Clerk Organizations model groups/courses. A teacher is assigned to one or more organizations and can see all students within them.

## User Identity

- **No generated IDs** — we use the Clerk user ID (`clerkId`) as the primary key for users in our database.
- User profile data (name, email, avatar) comes from Clerk; we store a minimal mirror in our DB for query convenience (joins with score logs).

## API Layer

- **tRPC** is kept for typed end-to-end API calls between client and server.
- Server Components by default; `"use client"` only at interaction boundaries.
- tRPC routers handle score CRUD, progress queries, and teacher dashboard data.

## Rendering Strategy

- Server Components for data-heavy pages (student list, dashboards).
- Client Components for interactive elements (score entry forms, charts).
- Charts rendered client-side with Recharts.
