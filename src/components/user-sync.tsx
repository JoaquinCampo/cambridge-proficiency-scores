"use client";

import { useEffect, useRef } from "react";
import { api } from "~/trpc/react";

/**
 * Ensures the authenticated Clerk user exists in our Prisma User table.
 * In production the Clerk webhook handles this, but locally (or if the
 * webhook hasn't fired yet) this guarantees the user record is created
 * on first app load.
 */
export function UserSync() {
  const hasSynced = useRef(false);
  const syncMutation = api.user.sync.useMutation();

  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
