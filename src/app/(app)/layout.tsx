import { AppNav } from "~/components/app-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-[960px] px-6 py-6">{children}</main>
    </>
  );
}
