"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/wordmark";
import { USERNAME_MAX, checkUsername } from "@/lib/username";

/**
 * The screen a player without a username sees, instead of the app.
 *
 * It is a gate rather than a prompt because everything social is keyed by
 * username: a friend is found by name, an invitation arrives from a name, and a
 * seat at a table shows one. An account with no name can be added by nobody and
 * shows up at the table as a blank, so there is nothing useful to let it
 * through to.
 *
 * It also catches the accounts that predate usernames, and the sign-up whose
 * chosen name lost the race to somebody else a second earlier — both arrive
 * here signed in, and leave with a name.
 */
export function UsernameGate() {
  const { setUsername, signOut } = useAuth();
  const [wanted, setWanted] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Checked as it is typed, but only shown once there is enough to judge —
  // telling somebody their name is too short while they are still typing the
  // third letter is noise, not help.
  const local = checkUsername(wanted);
  const preview = wanted.length >= 3 && !local.ok ? local.problem : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setProblem(null);

    const checked = checkUsername(wanted);
    if (!checked.ok) {
      setProblem(checked.problem);
      return;
    }

    setBusy(true);
    const result = await setUsername(checked.username);
    if (!result.ok) setProblem(result.problem);
    setBusy(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-12" />

        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.035em]">
          Pick a username
        </h1>
        <p className="mt-2 mb-9 text-[15px] text-muted">
          It&apos;s how friends find you and how you show up at a table. You
          keep it — a username can&apos;t be taken back once it&apos;s yours.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-[13px] text-muted">
              Username
            </label>
            <input
              id="username"
              value={wanted}
              autoFocus
              autoComplete="username"
              maxLength={USERNAME_MAX}
              onChange={(e) => setWanted(e.target.value)}
              placeholder="e.g. mara_p"
              className="rounded-sm border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink transition-colors placeholder:text-faint hover:border-faint/50 focus:border-accent focus:outline-none"
            />
            <p className="font-mono text-[11px] text-faint">
              {preview ?? "3–16 characters, letters, numbers and underscores"}
            </p>
          </div>

          {problem && (
            <p
              role="alert"
              className="rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
            >
              {problem}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !local.ok}
            className="mt-2 rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
          >
            {busy ? "Claiming…" : "Claim it"}
          </button>
        </form>

        <p className="mt-8 text-[13px] text-faint">
          Wrong account?{" "}
          <button
            type="button"
            onClick={() => signOut()}
            className="text-accent transition-colors hover:text-accent-hi"
          >
            Sign out
          </button>
        </p>
      </div>
    </main>
  );
}
