"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { FEEDBACK_MAX, sendFeedback } from "@/lib/feedback";

/**
 * Where a player says what is wrong with this.
 *
 * A page rather than a panel over the top of whatever you were doing: writing
 * down what went wrong takes as long as it takes, and a box that closes when
 * you click past it is a box people give up on halfway through. The bubble in
 * the top bar is on every screen that has one, so getting here is one press
 * from anywhere and getting back is the same.
 *
 * Nothing is asked for beyond the note itself, and nothing else is sent: no
 * name, no account, nothing that says where it came from. That is said on the
 * screen rather than left to be assumed, because a promise of anonymity is
 * only worth anything to somebody who knows it has been made — and the person
 * with the most useful thing to say about a game is usually the one who would
 * not say it with their name on it.
 */
export function FeedbackForm() {
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const said = text.trim();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !said || busy) return;

    setBusy(true);
    setProblem(null);
    try {
      await sendFeedback(said);
      setText("");
      setSent(true);
    } catch {
      setProblem("That didn't send. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-14 pb-24">
      <p className="eyebrow">Feedback</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em]">
        Tell us what isn&apos;t working.
      </h1>
      <p className="mt-3 text-[15px] text-muted">
        A question that was wrong, a game that got stuck, something you wish
        this did. It goes straight to the people who run hunat, and nobody else
        can read it.
      </p>
      <p className="mt-3 text-[15px] text-muted">
        It is sent{" "}
        <span className="text-ink">anonymously</span> — your name is not on it,
        and nothing stored with it says which account it came from. Say what you
        actually think.
      </p>

      {sent ? (
        <div className="animate-question-in mt-9">
          <p className="box px-5 py-4 text-[15px]">
            Sent, anonymously. Thank you — somebody reads every one of these.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
            >
              Write another
            </button>
            <Link
              href="/"
              className="text-[13px] text-faint transition-colors hover:text-ink"
            >
              Back to the library
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={send} className="mt-9">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, FEEDBACK_MAX))}
            rows={8}
            autoFocus
            placeholder="What happened?"
            aria-label="Your feedback"
            className="box w-full resize-y px-4 py-3.5 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <button
              type="submit"
              disabled={busy || said.length === 0}
              className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
            >
              {busy ? "Sending…" : "Send"}
            </button>

            {/* The counter only near the ceiling, because one on an empty box
                is a length requirement nobody set. It gives way to the thing
                worth repeating at the moment of pressing Send. */}
            <span className="font-mono text-[11px] text-faint tnum">
              {text.length > FEEDBACK_MAX - 200
                ? `${FEEDBACK_MAX - text.length} left`
                : "Sent anonymously"}
            </span>
          </div>

          {problem && (
            <p role="alert" className="mt-4 text-[13px] text-out">
              {problem}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
