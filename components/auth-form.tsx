"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import { Wordmark } from "@/components/wordmark";
import { USERNAME_MAX, checkUsername } from "@/lib/username";

type Mode = "signin" | "signup";

const COPY = {
  signin: {
    title: "Sign in",
    lede: "Pick up your streak where you left it.",
    action: "Sign in",
    switchText: "New here?",
    switchLabel: "Create an account",
    switchHref: "/signup" as const,
  },
  signup: {
    title: "Create an account",
    lede: "Your level and streak follow you across every course.",
    action: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login" as const,
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const { user, loading, signIn, signUp } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Someone already signed in has no business on this page.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "signup") {
        // Judged here as well as by the gate, so the reason is stated next to
        // the field being typed into rather than on the screen after it.
        const checked = checkUsername(username);
        if (!checked.ok) {
          setError(checked.problem);
          setBusy(false);
          return;
        }

        // A name that was claimed a second ago by somebody else does not undo
        // the account: it is made, it is signed in, and the gate asks again.
        const claim = await signUp(email.trim(), password, checked.username);
        if (!claim.ok) setError(claim.problem);
      } else {
        await signIn(email.trim(), password);
      }
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-12" />

        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em]">
          {copy.title}
        </h1>
        <p className="mt-2 mb-9 text-[15px] text-muted">{copy.lede}</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <Field
              label="Username"
              id="username"
              type="text"
              autoComplete="username"
              required
              maxLength={USERNAME_MAX}
              value={username}
              onChange={setUsername}
              placeholder="How friends find you"
              hint="3–16 characters, letters, numbers and underscores"
            />
          )}

          <Field
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
          />

          <Field
            label="Password"
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={setPassword}
            hint={mode === "signup" ? "At least six characters" : undefined}
          />

          {error && (
            <p
              role="alert"
              className="rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
          >
            {busy ? "Working…" : copy.action}
          </button>
        </form>

        <p className="mt-8 text-[13px] text-faint">
          {copy.switchText}{" "}
          <Link
            href={copy.switchHref}
            className="text-accent transition-colors hover:text-accent-hi"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  hint,
  value,
  onChange,
  ...rest
}: {
  label: string;
  id: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink transition-colors placeholder:text-faint hover:border-faint/50 focus:border-accent focus:outline-none"
        {...rest}
      />
      {hint && <p className="font-mono text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
