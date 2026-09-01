"use client";

import { useEffect, useState } from "react";

/**
 * The room code, with a button that copies it.
 *
 * Shared by both games that open a room, because the code is the whole of how
 * a second player gets in: everything else about a multiplayer game is inside
 * a room nobody can reach until these six characters have got to somebody. Six
 * characters is also exactly the length at which reading them out loud starts
 * going wrong — B and D and G sound alike, and a code with one letter wrong
 * fails in the same way as a code that was never sent.
 *
 * The code stays on screen at full size either way. A browser that refuses the
 * clipboard — an insecure origin, a permission turned off — leaves the player
 * exactly where they were before the button existed, which is why the failure
 * is silent rather than an error nobody can act on.
 */
export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return;
    }
    setCopied(true);
  }

  return (
    <div className="flex items-center gap-4">
      <p className="font-mono text-[44px] leading-none tracking-[0.14em] text-accent tnum">
        {code}
      </p>
      <button
        type="button"
        onClick={copy}
        // Announced rather than only recoloured: the label is the whole of the
        // feedback, and it changes under a pointer that has already moved on.
        aria-live="polite"
        className="box box-tap px-3 py-2 font-mono text-[11px] tracking-[0.12em] text-muted"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}
