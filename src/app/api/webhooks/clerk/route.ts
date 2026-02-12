import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient, type WebhookEvent } from "@clerk/nextjs/server";
import { env } from "~/env";
import { db } from "~/server/db";

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature || !env.CLERK_WEBHOOK_SECRET) {
    return new Response("Missing svix headers or webhook secret", {
      status: 400,
    });
  }

  const payload = (await req.json()) as Record<string, unknown>;
  const body = JSON.stringify(payload);

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name =
        [first_name, last_name].filter(Boolean).join(" ") || null;

      await db.user.upsert({
        where: { clerkId: id },
        create: { clerkId: id, email, name },
        update: { email, name },
      });
      break;
    }
    case "user.deleted": {
      const { id } = event.data;
      if (id) {
        await db.user.delete({ where: { clerkId: id } }).catch(() => {
          // User may not exist in our DB yet
        });
      }
      break;
    }
    case "organizationMembership.created": {
      const { public_user_data, organization } = event.data;
      const userId = public_user_data.user_id;
      const orgId = organization.id;

      // Ensure user record exists (user.created webhook may not have fired yet)
      if (userId && public_user_data.identifier) {
        await db.user.upsert({
          where: { clerkId: userId },
          create: {
            clerkId: userId,
            email: public_user_data.identifier,
            name:
              [public_user_data.first_name, public_user_data.last_name]
                .filter(Boolean)
                .join(" ") || null,
          },
          update: {},
        });
      }

      // Look up the invitation that created this membership to get groupId.
      // Invitation publicMetadata does NOT transfer to membership public_metadata,
      // so we need to query the invitation directly.
      let groupId: string | undefined;
      if (public_user_data.identifier) {
        try {
          const clerk = await clerkClient();
          const invitations =
            await clerk.organizations.getOrganizationInvitationList({
              organizationId: orgId,
              limit: 100,
            });
          const matchingInvite = invitations.data.find(
            (inv) =>
              inv.emailAddress === public_user_data.identifier &&
              (inv.status === "accepted" || inv.status === "pending"),
          );
          groupId = (
            matchingInvite?.publicMetadata as { groupId?: string } | undefined
          )?.groupId;
        } catch {
          // If invitation lookup fails, proceed without group assignment
        }
      }

      // Auto-assign to group if invitation carried a groupId
      if (userId && groupId) {
        const group = await db.group.findUnique({
          where: { id: groupId },
        });

        if (group?.organizationId === orgId) {
          // Deactivate any existing active membership in this org
          await db.groupMember.updateMany({
            where: {
              userId,
              active: true,
              group: { organizationId: orgId },
            },
            data: { active: false, leftAt: new Date() },
          });

          await db.groupMember.upsert({
            where: { groupId_userId: { groupId, userId } },
            create: { groupId, userId, active: true },
            update: { active: true, joinedAt: new Date(), leftAt: null },
          });
        }
      }
      break;
    }
    case "organizationMembership.deleted": {
      const { public_user_data, organization } = event.data;
      const userId = public_user_data.user_id;
      const orgId = organization.id;

      // Deactivate all group memberships for this user in this org
      const memberships = await db.groupMember.findMany({
        where: {
          userId,
          active: true,
          group: { organizationId: orgId },
        },
      });

      if (memberships.length > 0) {
        await db.groupMember.updateMany({
          where: {
            id: { in: memberships.map((m) => m.id) },
          },
          data: { active: false, leftAt: new Date() },
        });
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
