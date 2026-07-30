"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (response.ok) {
      // Full navigation so middleware re-evaluates with the new cookie.
      window.location.href = searchParams.get("next") ?? "/";
      return;
    }

    const body = await response.json().catch(() => ({}));
    setError(body.error ?? "Something went wrong. Try again.");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-1">
        <label htmlFor="passcode" className="text-sm font-medium text-zinc-300">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-400"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || passcode.length === 0}
        className="w-full rounded-lg bg-zinc-100 px-3 py-2 font-medium text-zinc-900 transition disabled:opacity-40"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-100">Tuning Fork</h1>
        <p className="mt-1 text-sm text-zinc-500">Personal music development tracker</p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
