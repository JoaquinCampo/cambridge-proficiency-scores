import { AppNav } from "~/components/app-nav";
import { UserSync } from "~/components/user-sync";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserSync />
      <AppNav />
      <main className="mx-auto max-w-[960px] px-6 py-6">{children}</main>
    </>
  );
}
