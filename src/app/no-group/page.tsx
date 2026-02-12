import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export default async function NoGroupPage() {
  const { orgId } = await auth();

  if (orgId) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">No group assigned</h1>
      <p className="max-w-md text-muted-foreground">
        You don&apos;t belong to any group yet. Ask your teacher to add you to
        their group, then refresh this page.
      </p>
      <UserButton afterSignOutUrl="/sign-in" />
    </main>
  );
}
