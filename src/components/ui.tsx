import type { ComponentProps, ReactNode } from "react";

import { domainMeta } from "@/lib/domains";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  ...rest
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface-1 p-4",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-xs font-medium tracking-wide text-ink-faint uppercase">
        {title}
      </h2>
      {action}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-accent text-accent-ink hover:brightness-110 active:brightness-95 font-semibold",
  secondary:
    "bg-surface-2 text-ink border border-line hover:bg-surface-3",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
  danger: "text-danger border border-line hover:bg-surface-2",
} as const;

export function Button({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      className={cn(
        // min-h-11 keeps every control at a comfortable thumb target on mobile.
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm transition disabled:opacity-40",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-sm font-medium text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

const CONTROL =
  "w-full min-h-11 rounded-xl border border-line bg-surface-2 px-3 text-ink placeholder:text-ink-faint transition focus:border-line-strong";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(CONTROL, "min-h-20 py-2 leading-relaxed", className)} {...rest} />
  );
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "appearance-none pr-8", className)} {...rest} />;
}

/** Small coloured dot plus label, the standard way a domain appears anywhere. */
export function DomainTag({
  domain,
  minutes,
}: {
  domain: string;
  minutes?: number;
}) {
  const meta = domainMeta(domain);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
      {minutes !== undefined ? (
        <span className="tabular-nums text-ink-faint">{minutes}m</span>
      ) : null}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
