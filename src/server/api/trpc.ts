import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";

import { db } from "~/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const clerkAuth = await auth();

  const isDev = process.env.NODE_ENV === "development";
  const userId = clerkAuth.userId ?? (isDev ? "user_fake_student_001" : null);
  const orgId = clerkAuth.orgId ?? (isDev ? "org_fake_academy" : null);
  const sessionClaims = clerkAuth.sessionClaims ?? (isDev ? { metadata: { role: "teacher" } } as unknown as typeof clerkAuth.sessionClaims : null);

  return {
    ...opts,
    db,
    userId,
    orgId,
    sessionClaims,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId, orgId: ctx.orgId },
  });
});

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceAuth);

const enforceTeacher = t.middleware(async ({ ctx, next }) => {
  const role = (
    ctx.sessionClaims?.metadata as { role?: string } | undefined
  )?.role;
  if (role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const teacherProcedure = protectedProcedure.use(enforceTeacher);
