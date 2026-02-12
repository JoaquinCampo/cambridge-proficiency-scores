import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, teacherProcedure } from "~/server/api/trpc";

export const groupRouter = createTRPCRouter({
  create: teacherProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      return ctx.db.group.create({
        data: {
          name: input.name,
          organizationId: ctx.orgId,
        },
      });
    }),

  list: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const groups = await ctx.db.group.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        _count: { select: { members: { where: { active: true } } } },
      },
      orderBy: { name: "asc" },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      activeMembers: g._count.members,
      createdAt: g.createdAt,
    }));
  }),

  update: teacherProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
      });

      if (group?.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.group.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
      });

      if (group?.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.group.delete({ where: { id: input.id } });
      return { success: true };
    }),

  members: teacherProcedure
    .input(
      z.object({
        groupId: z.string(),
        activeOnly: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (group?.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const members = await ctx.db.groupMember.findMany({
        where: {
          groupId: input.groupId,
          ...(input.activeOnly ? { active: true } : {}),
        },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      });

      return members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name ?? "Unnamed",
        email: m.user.email,
        active: m.active,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
      }));
    }),

  addMember: teacherProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify group belongs to this org
      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (group?.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Ensure user record exists — they may be in Clerk but not yet in our DB
      const existingUser = await ctx.db.user.findUnique({
        where: { clerkId: input.userId },
      });

      if (!existingUser) {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(input.userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
        const name =
          [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ") || null;

        try {
          await ctx.db.user.create({
            data: { clerkId: input.userId, email, name },
          });
        } catch {
          // Email conflict — update the existing stale record
          await ctx.db.user.update({
            where: { email },
            data: { clerkId: input.userId, name },
          });
        }
      }

      // Check for existing active membership in this org
      const existingActive = await ctx.db.groupMember.findFirst({
        where: {
          userId: input.userId,
          active: true,
          group: { organizationId: ctx.orgId },
        },
      });

      if (existingActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Student already has an active group in this organization",
        });
      }

      return ctx.db.groupMember.upsert({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: input.userId,
          },
        },
        create: {
          groupId: input.groupId,
          userId: input.userId,
          active: true,
        },
        update: {
          active: true,
          joinedAt: new Date(),
          leftAt: null,
        },
      });
    }),

  removeMember: teacherProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const membership = await ctx.db.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: input.userId,
          },
        },
        include: { group: true },
      });

      if (membership?.group.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.groupMember.update({
        where: { id: membership.id },
        data: { active: false, leftAt: new Date() },
      });
    }),

  moveMember: teacherProcedure
    .input(
      z.object({
        userId: z.string(),
        fromGroupId: z.string(),
        toGroupId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // Verify both groups belong to this org
      const [fromGroup, toGroup] = await Promise.all([
        ctx.db.group.findUnique({ where: { id: input.fromGroupId } }),
        ctx.db.group.findUnique({ where: { id: input.toGroupId } }),
      ]);

      if (
        fromGroup?.organizationId !== ctx.orgId ||
        toGroup?.organizationId !== ctx.orgId
      ) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.$transaction(async (tx) => {
        // Deactivate old membership
        await tx.groupMember.updateMany({
          where: {
            userId: input.userId,
            groupId: input.fromGroupId,
            active: true,
          },
          data: { active: false, leftAt: new Date() },
        });

        // Create or reactivate new membership
        await tx.groupMember.upsert({
          where: {
            groupId_userId: {
              groupId: input.toGroupId,
              userId: input.userId,
            },
          },
          create: {
            groupId: input.toGroupId,
            userId: input.userId,
            active: true,
          },
          update: {
            active: true,
            joinedAt: new Date(),
            leftAt: null,
          },
        });

        return { success: true };
      });
    }),

  pendingInvitations: teacherProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const group = await ctx.db.group.findUnique({
        where: { id: input.groupId },
      });

      if (group?.organizationId !== ctx.orgId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const clerk = await clerkClient();
      const invitations =
        await clerk.organizations.getOrganizationInvitationList({
          organizationId: ctx.orgId,
          status: ["pending"],
          limit: 100,
        });

      return invitations.data
        .filter((inv) => {
          const meta = inv.publicMetadata as { groupId?: string } | undefined;
          return meta?.groupId === input.groupId;
        })
        .map((inv) => ({
          id: inv.id,
          emailAddress: inv.emailAddress,
          createdAt: inv.createdAt,
        }));
    }),

  revokeInvitation: teacherProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId || !ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      const clerk = await clerkClient();
      await clerk.organizations.revokeOrganizationInvitation({
        organizationId: ctx.orgId,
        invitationId: input.invitationId,
        requestingUserId: ctx.userId,
      });

      return { success: true };
    }),
});
