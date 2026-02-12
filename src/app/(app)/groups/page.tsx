"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Users, ChevronRight } from "lucide-react";
import { api } from "~/trpc/react";
import { PageHeader } from "~/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

export default function GroupsPage() {
  const utils = api.useUtils();
  const { data: groups, isLoading } = api.group.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <PageHeader
        title="Groups"
        description="Manage your class groups and students"
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--secondary)]"
            />
          ))}
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">
            No groups yet
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create your first group to start organizing students.
          </p>
          <button
            className="mt-4 flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="card-base group flex flex-col gap-3 p-5"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-[var(--foreground)]">
                  {group.name}
                </h3>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRenameTarget({ id: group.id, name: group.name });
                    }}
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget({ id: group.id, name: group.name });
                    }}
                    className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted-foreground)] hover:bg-[rgba(185,28,28,0.08)] hover:text-[var(--destructive)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {group.activeMembers} student
                    {group.activeMembers !== 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => void utils.group.list.invalidate()}
      />

      {/* Rename Group Dialog */}
      {renameTarget && (
        <RenameGroupDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          groupId={renameTarget.id}
          currentName={renameTarget.name}
          onSuccess={() => void utils.group.list.invalidate()}
        />
      )}

      {/* Delete Group Dialog */}
      {deleteTarget && (
        <DeleteGroupDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          groupId={deleteTarget.id}
          groupName={deleteTarget.name}
          onSuccess={() => void utils.group.list.invalidate()}
        />
      )}
    </>
  );
}

function CreateGroupDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const createMutation = api.group.create.useMutation({
    onSuccess: () => {
      setName("");
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
            if (name.trim()) createMutation.mutate({ name: name.trim() });
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Give your new group a name, like &quot;Proficiency Monday
              2026&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Input
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
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
              disabled={!name.trim() || createMutation.isPending}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameGroupDialog({
  open,
  onOpenChange,
  groupId,
  currentName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentName: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(currentName);
  const updateMutation = api.group.update.useMutation({
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
            if (name.trim())
              updateMutation.mutate({ id: groupId, name: name.trim() });
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Rename Group</DialogTitle>
            <DialogDescription>
              Enter a new name for this group.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Input
              placeholder="Group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
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
              disabled={!name.trim() || updateMutation.isPending}
              className="flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGroupDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onSuccess: () => void;
}) {
  const deleteMutation = api.group.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Delete Group</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{groupName}&quot;? Student
            assignments will be removed, but their scores are preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 px-6 py-6">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => deleteMutation.mutate({ id: groupId })}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1.5 rounded-full bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
