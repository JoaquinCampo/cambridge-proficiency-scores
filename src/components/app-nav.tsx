"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  ChartLine,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "~/lib/utils";

const studentLinks = [
  { href: "/", label: "Scores", icon: FileText },
  { href: "/progress", label: "Progress", icon: ChartLine },
];

const teacherLinks = [
  { href: "/students", label: "Students", icon: Users },
];

// TODO: derive from Clerk session in production
const DEV_ROLE = "teacher";

export function AppNav() {
  const pathname = usePathname();
  const links = DEV_ROLE === "teacher" ? [...studentLinks, ...teacherLinks] : studentLinks;

  return (
    <nav className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6 py-3">
      {/* Left side */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-m)] bg-[var(--primary)]">
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
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--secondary)] text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                )}
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
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--secondary)] px-3 py-1.5">
          <Building2 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <span className="text-[13px] font-medium text-[var(--foreground)]">
            B2 Monday
          </span>
        </div>

        {/* User avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)]">
          <span className="text-xs font-semibold text-white">JC</span>
        </div>
      </div>
    </nav>
  );
}
