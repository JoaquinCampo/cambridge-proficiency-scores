"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ChartLine,
  Users,
  Building2,
  LayoutDashboard,
  FolderOpen,
} from "lucide-react";
import { UserButton, useOrganization } from "@clerk/nextjs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const studentLinks = [
  { href: "/", label: "Scores", icon: FileText },
  { href: "/progress", label: "Progress", icon: ChartLine },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/groups", label: "Groups", icon: FolderOpen },
  { href: "/students", label: "Students", icon: Users },
];

export function AppNav() {
  const pathname = usePathname();
  const { data: me } = api.user.me.useQuery();
  const { organization } = useOrganization();

  const isTeacher = me?.role === "teacher";
  const links = isTeacher ? teacherLinks : studentLinks;

  return (
    <nav className="nav-glass sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] px-6 py-3 shadow-[var(--shadow-nav)]">
      {/* Left side */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-m)] bg-gradient-to-br from-[var(--primary)] to-[#6D28D9] shadow-sm transition-transform group-hover:scale-105" style={{ transitionDuration: "var(--transition-fast)" }}>
            <span className="text-xs font-bold text-white">C2</span>
          </div>
          <span className="text-base font-semibold text-[var(--foreground)]">
            Proficiency Scores
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[var(--secondary)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/60 hover:text-[var(--foreground)]",
                )}
                style={{ transitionDuration: "var(--transition-fast)" }}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Org badge */}
        {organization && (
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--secondary)] px-3 py-1.5">
            {organization.imageUrl ? (
              <Image
                src={organization.imageUrl}
                alt={organization.name}
                width={16}
                height={16}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            )}
            <span className="text-[13px] font-medium text-[var(--foreground)]">
              {organization.name}
            </span>
          </div>
        )}

        {/* User avatar from Clerk */}
        <UserButton />
      </div>
    </nav>
  );
}
