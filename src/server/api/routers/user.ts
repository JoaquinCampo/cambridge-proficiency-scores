import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });

    return {
      clerkId: ctx.userId,
      orgId: ctx.orgId,
      role: ctx.role ?? "student",
      name: user?.name ?? null,
      email: user?.email ?? null,
    };
  }),

  list: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    // Return all users in this org's score logs, excluding the current teacher
    const scoreUsers = await ctx.db.scoreLog.findMany({
      where: { organizationId: ctx.orgId },
      select: { userId: true },
      distinct: ["userId"],
    });

    const studentIds = scoreUsers
      .map((s) => s.userId)
      .filter((id) => id !== ctx.userId);

    const users = await ctx.db.user.findMany({
      where: { clerkId: { in: studentIds } },
      orderBy: { name: "asc" },
    });

    return users;
  }),

  get: teacherProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return user;
    }),

  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(ctx.userId);

    const user = await ctx.db.user.upsert({
      where: { clerkId: ctx.userId },
      create: {
        clerkId: ctx.userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          null,
      },
      update: {
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          null,
      },
    });

    return user;
  }),
});
