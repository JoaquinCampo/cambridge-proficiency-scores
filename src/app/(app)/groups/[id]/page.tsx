"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mail,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  ChevronLeft,
  Check,
  Loader2,
  X,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const groupId = params.id;
  const utils = api.useUtils();

  const { data: groups } = api.group.list.useQuery();
  const group = groups?.find((g) => g.id === groupId);

  const { data: members, isLoading: membersLoading } =
    api.group.members.useQuery({ groupId });

  const { data: pendingInvitations } =
    api.group.pendingInvitations.useQuery({ groupId });

  const { data: orgMembers } = api.user.orgMembers.useQuery();
  const ungrouped =
    orgMembers?.filter((m) => m.activeGroup === null) ?? [];

  const [inviteOpen, setInviteOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const removeMutation = api.group.removeMember.useMutation({
    onSuccess: () => {
      void utils.group.members.invalidate({ groupId });
      void utils.group.list.invalidate();
      void utils.user.orgMembers.invalidate();
    },
  });

  const revokeMutation = api.group.revokeInvitation.useMutation({
    onSuccess: () => {
      void utils.group.pendingInvitations.invalidate({ groupId });
    },
  });

  const addMutation = api.group.addMember.useMutation({
    onSuccess: () => {
      void utils.group.members.invalidate({ groupId });
      void utils.group.list.invalidate();
      void utils.user.orgMembers.invalidate();
    },
  });

  if (!group && !membersLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">
          Group not found.
        </p>
        <button
          className="mt-4 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
          onClick={() => router.push("/groups")}
        >
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Groups
        </Link>
      </div>

      <PageHeader
        title={group?.name ?? "Loading..."}
        description={`${group?.activeMembers ?? 0} active student${group?.activeMembers !== 1 ? "s" : ""}`}
        action={
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Mail className="h-4 w-4" />
            Invite Student
          </button>
        }
      />

      <div className="flex flex-col gap-8">
        {/* Active Members */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            Active Students
          </h2>
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : !members || members.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-10 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No students in this group yet. Invite someone or add an existing
                student.
              </p>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]">
                    <span className="text-xs font-semibold text-white">
                      {getInitials(member.name)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">
                      {member.name}
                    </span>
                    <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                      {member.email}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Joined{" "}
                    {new Date(member.joinedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    {groups && groups.length > 1 && (
                      <button
                        onClick={() =>
                          setMoveTarget({
                            userId: member.userId,
                            name: member.name,
                          })
                        }
                        title="Move to another group"
                        className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        removeMutation.mutate({
                          groupId,
                          userId: member.userId,
                        })
                      }
                      title="Remove from group"
                      className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[rgba(185,28,28,0.08)] hover:text-[var(--destructive)]"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              Pending Invitations
            </h2>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]">
                    <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">
                      {inv.emailAddress}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      Invited{" "}
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      revokeMutation.mutate({ invitationId: inv.id })
                    }
                    disabled={revokeMutation.isPending}
                    title="Revoke invitation"
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[rgba(185,28,28,0.08)] hover:text-[var(--destructive)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ungrouped Students */}
        {ungrouped.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              Ungrouped Students
            </h2>
            <p className="mb-3 text-xs text-[var(--muted-foreground)]">
              These students are in your organization but not assigned to any
              group.
            </p>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {ungrouped.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-b-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)]">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                      {getInitials(member.name)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">
                      {member.name ?? "Unnamed"}
                    </span>
                    <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                      {member.email}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      addMutation.mutate({ groupId, userId: member.userId })
                    }
                    disabled={addMutation.isPending}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add to Group
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Invite Student Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        groupId={groupId}
        onInviteSent={() =>
          void utils.group.pendingInvitations.invalidate({ groupId })
        }
      />

      {/* Move Student Dialog */}
      {moveTarget && groups && (
        <MoveDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          userId={moveTarget.userId}
          studentName={moveTarget.name}
          fromGroupId={groupId}
          groups={groups.filter((g) => g.id !== groupId)}
          onSuccess={() => {
            setMoveTarget(null);
            void utils.group.members.invalidate({ groupId });
            void utils.group.list.invalidate();
            void utils.user.orgMembers.invalidate();
          }}
        />
      )}
    </>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  groupId,
  onInviteSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onInviteSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const inviteMutation = api.user.invite.useMutation({
    onSuccess: (data) => {
      setSuccess(data.emailAddress);
      setEmail("");
      onInviteSent();
    },
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail("");
      setSuccess(null);
      inviteMutation.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0">
        {success ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(5,150,105,0.1)]">
              <Check
                className="h-6 w-6"
                style={{ color: "var(--band-grade-a)" }}
              />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Invitation sent!
            </p>
            <p className="text-center text-sm text-[var(--muted-foreground)]">
              An invitation was sent to {success}. They&apos;ll be
              automatically added to this group when they accept.
            </p>
            <button
              className="mt-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
              onClick={() => handleClose(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim())
                inviteMutation.mutate({
                  emailAddress: email.trim(),
                  groupId,
                });
            }}
          >
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Invite Student</DialogTitle>
              <DialogDescription>
                Send an invitation by email. The student will be automatically
                added to this group when they accept.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-2">
              <Input
                type="email"
                placeholder="student@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {inviteMutation.error && (
                <p className="mt-2 text-sm text-[var(--destructive)]">
                  {inviteMutation.error.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-6">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!email.trim() || inviteMutation.isPending}
                className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                <Mail className="h-3.5 w-3.5" />
                {inviteMutation.isPending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  open,
  onOpenChange,
  userId,
  studentName,
  fromGroupId,
  groups,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  studentName: string;
  fromGroupId: string;
  groups: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [targetGroupId, setTargetGroupId] = useState(groups[0]?.id ?? "");

  const moveMutation = api.group.moveMember.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (targetGroupId)
              moveMutation.mutate({
                userId,
                fromGroupId,
                toGroupId: targetGroupId,
              });
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Move Student</DialogTitle>
            <DialogDescription>
              Move {studentName} to a different group. Their existing scores stay
              with the current group.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <select
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
              className="w-full rounded-[var(--radius-m)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 px-6 py-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetGroupId || moveMutation.isPending}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {moveMutation.isPending ? "Moving..." : "Move"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
