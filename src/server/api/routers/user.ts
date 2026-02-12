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

    // Also fetch the student's active group (if any)
    let activeGroup: { id: string; name: string } | null = null;
    if (ctx.orgId) {
      const membership = await ctx.db.groupMember.findFirst({
        where: {
          userId: ctx.userId,
          active: true,
          group: { organizationId: ctx.orgId },
        },
        include: { group: { select: { id: true, name: true } } },
      });
      activeGroup = membership?.group ?? null;
    }

    return {
      clerkId: ctx.userId,
      orgId: ctx.orgId,
      role: ctx.role ?? "student",
      name: user?.name ?? null,
      email: user?.email ?? null,
      activeGroup,
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
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;

    let user;
    try {
      user = await ctx.db.user.upsert({
        where: { clerkId: ctx.userId },
        create: { clerkId: ctx.userId, email, name },
        update: { email, name },
      });
    } catch {
      // Email unique constraint conflict — a record exists with this email
      // but a different clerkId (e.g. stale webhook data). Link it to the
      // current Clerk user.
      user = await ctx.db.user.update({
        where: { email },
        data: { clerkId: ctx.userId, name },
      });
    }

    // Auto-assign student to group if they have no active group.
    // Looks up their Clerk org invitation to find the groupId.
    if (ctx.orgId && ctx.role !== "teacher") {
      const hasActiveGroup = await ctx.db.groupMember.findFirst({
        where: {
          userId: ctx.userId,
          active: true,
          group: { organizationId: ctx.orgId },
        },
      });

      if (!hasActiveGroup && email) {
        try {
          const invitations =
            await clerk.organizations.getOrganizationInvitationList({
              organizationId: ctx.orgId,
              limit: 100,
            });

          console.log(
            `[sync] Looking for invitation for ${email} in org ${ctx.orgId}. Found ${invitations.data.length} invitations:`,
            invitations.data.map((inv) => ({
              email: inv.emailAddress,
              status: inv.status,
              meta: inv.publicMetadata,
            })),
          );

          const matchingInvite = invitations.data.find(
            (inv) => inv.emailAddress === email,
          );

          console.log(
            `[sync] Matching invite:`,
            matchingInvite
              ? {
                  email: matchingInvite.emailAddress,
                  status: matchingInvite.status,
                  meta: matchingInvite.publicMetadata,
                }
              : "none",
          );

          const groupId = (
            matchingInvite?.publicMetadata as
              | { groupId?: string }
              | undefined
          )?.groupId;

          if (groupId) {
            const group = await ctx.db.group.findUnique({
              where: { id: groupId },
            });

            console.log(
              `[sync] Group lookup for ${groupId}:`,
              group ? { id: group.id, orgId: group.organizationId } : "not found",
            );

            if (group?.organizationId === ctx.orgId) {
              await ctx.db.groupMember.upsert({
                where: { groupId_userId: { groupId, userId: ctx.userId } },
                create: { groupId, userId: ctx.userId, active: true },
                update: { active: true, joinedAt: new Date(), leftAt: null },
              });
              console.log(
                `[sync] Auto-assigned ${ctx.userId} to group ${groupId}`,
              );
            }
          } else {
            console.log(`[sync] No groupId found in invitation metadata`);
          }
        } catch (err) {
          console.error(`[sync] Invitation lookup failed:`, err);
        }
      } else if (hasActiveGroup) {
        console.log(`[sync] User ${ctx.userId} already has active group`);
      }
    }

    return user;
  }),

  invite: teacherProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        groupId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active organization",
        });
      }

      // If groupId provided, verify it belongs to this org
      if (input.groupId) {
        const group = await ctx.db.group.findUnique({
          where: { id: input.groupId },
        });
        if (group?.organizationId !== ctx.orgId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
        }
      }

      const clerk = await clerkClient();

      try {
        const invitation =
          await clerk.organizations.createOrganizationInvitation({
            organizationId: ctx.orgId,
            emailAddress: input.emailAddress,
            inviterUserId: ctx.userId ?? undefined,
            role: "org:member",
            publicMetadata: input.groupId ? { groupId: input.groupId } : {},
          });

        return {
          id: invitation.id,
          emailAddress: invitation.emailAddress,
          status: invitation.status,
        };
      } catch (error: unknown) {
        console.error("[invite] Clerk error:", error);

        // Clerk errors have nested error messages
        let message = "Failed to send invitation";
        if (error && typeof error === "object") {
          const clerkErr = error as {
            errors?: { longMessage?: string; message?: string }[];
            message?: string;
          };
          message =
            clerkErr.errors?.[0]?.longMessage ??
            clerkErr.errors?.[0]?.message ??
            clerkErr.message ??
            message;
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }
    }),

  orgMembers: teacherProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const clerk = await clerkClient();

    // Fetch all org members from Clerk
    const membershipList =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: ctx.orgId,
        limit: 100,
      });

    // Get all active group memberships in this org
    const activeGroupMemberships = await ctx.db.groupMember.findMany({
      where: {
        active: true,
        group: { organizationId: ctx.orgId },
      },
      include: { group: { select: { id: true, name: true } } },
    });

    const groupByUserId = new Map(
      activeGroupMemberships.map((m) => [m.userId, m.group]),
    );

    return membershipList.data
      .filter((m) => m.publicUserData?.userId !== ctx.userId) // exclude the teacher
      .map((m) => {
        const userId = m.publicUserData?.userId ?? "";
        const group = groupByUserId.get(userId);

        return {
          userId,
          name:
            [m.publicUserData?.firstName, m.publicUserData?.lastName]
              .filter(Boolean)
              .join(" ") || null,
          email: m.publicUserData?.identifier ?? null,
          role: m.role,
          activeGroup: group ?? null,
        };
      });
  }),
});
