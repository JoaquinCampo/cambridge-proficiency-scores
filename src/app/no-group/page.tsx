"use client";

import { useOrganizationList, UserButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";

export default function NoGroupPage() {
  const { userInvitations, isLoaded, setActive } = useOrganizationList({
    userInvitations: { status: "pending" },
  });

  const invitations = userInvitations?.data ?? [];

  async function handleAccept(invitationId: string) {
    if (!userInvitations) return;
    const invitation = invitations.find((i) => i.id === invitationId);
    if (!invitation) return;

    await invitation.accept();

    // After accepting, set the org as active so the middleware picks it up
    if (setActive) {
      await setActive({ organization: invitation.publicOrganizationData.id });
    }

    // Redirect to the app
    window.location.href = "/";
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">No group assigned</h1>

      {!isLoaded ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : invitations.length > 0 ? (
        <div className="flex flex-col items-center gap-4">
          <p className="max-w-md text-muted-foreground">
            You have pending invitations. Join a group to get started.
          </p>
          <div className="flex flex-col gap-2">
            {invitations.map((invitation) => (
              <Button
                key={invitation.id}
                onClick={() => handleAccept(invitation.id)}
              >
                Join {invitation.publicOrganizationData.name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="max-w-md text-muted-foreground">
          You don&apos;t belong to any group yet. Ask your teacher to invite you
          to their group, then refresh this page.
        </p>
      )}

      <UserButton afterSignOutUrl="/sign-in" />
    </main>
  );
}
