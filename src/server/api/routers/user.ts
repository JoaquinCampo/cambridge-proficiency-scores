import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  list: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    // In dev mode, return all students from DB (no Clerk dependency)
    if (process.env.NODE_ENV === "development") {
      return ctx.db.user.findMany({
        where: { clerkId: { startsWith: "user_fake_student_" } },
        orderBy: { name: "asc" },
      });
    }

    const clerk = await clerkClient();
    const memberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: ctx.orgId,
      });

    const studentMembers = memberships.data.filter((m) => {
      return m.role === "org:member";
    });

    const userIds = studentMembers
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => !!id);

    const users = await ctx.db.user.findMany({
      where: { clerkId: { in: userIds } },
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
