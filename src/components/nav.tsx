"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui";

/**
 * Five items is about the ceiling for a thumb-reachable bottom bar. Stages 6-9
 * add more sections, so those will need a hub or an overflow rather than
 * another entry here.
 */
const LINKS = [
  { href: "/", label: "Today" },
  { href: "/skills", label: "Skills" },
  { href: "/drills", label: "Drills" },
  { href: "/sessions", label: "History" },
  { href: "/log", label: "Log", primary: true },
];

/**
 * Bottom bar on mobile, top bar from `sm` up.
 *
 * Bottom placement is the point: logging happens standing at a kit or with a
 * guitar on, one-handed, and the bottom of the screen is the only part reliably
 * reachable with a thumb.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-1/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
        "sm:sticky sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b sm:pb-0",
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-1 px-2 py-2 sm:gap-2 sm:px-4 sm:py-3">
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          Tuning Fork
        </span>
        <div className="flex flex-1 items-center justify-around gap-2 sm:flex-none sm:justify-end">
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-center text-[13px] leading-tight transition sm:px-4 sm:text-sm sm:flex-none",
                  link.primary
                    ? "bg-accent font-semibold text-accent-ink hover:brightness-110"
                    : active
                      ? "bg-surface-2 font-medium text-ink"
                      : "text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
