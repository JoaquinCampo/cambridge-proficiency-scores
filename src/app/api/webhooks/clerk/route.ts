import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
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
  }

  return new Response("OK", { status: 200 });
}
