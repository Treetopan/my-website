"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { UsernameGate } from "@/components/username-gate";
import { SurveyGate } from "@/components/survey-gate";
import { watchSurvey, type SurveyState } from "@/lib/survey";

/**
 * Client-side gate. Firebase Auth holds its session in IndexedDB, so the
 * server has no view of it without the Admin SDK and a session cookie — this
 * is the honest boundary for an RTDB app. The database rules are what actually
 * protect data; this only decides what the UI shows.
 *
 * It gates on three things in order, each one a prerequisite of the next:
 *
 *  1. **Signed in.** Everything below needs a uid. Somebody without one is
 *     sent to `/signup` rather than `/login`, because almost anybody who
 *     reaches a gated screen without an account has just followed a link
 *     from somebody who has one. The few who are returning are one small
 *     link away, and `/` shows them the landing page rather than either.
 *  2. **Named.** A player with no username cannot be added as a friend, cannot
 *     be invited, and sits at the table as a blank — so the name is asked for
 *     here, once, rather than checked for again on every screen that needs it.
 *  3. **Asked.** The survey, which is only ever shown to somebody who has just
 *     arrived. It is a gate in position only: skipping costs one press, and
 *     skipping is recorded, so nobody meets it twice.
 *
 * The survey is the one of the three that yields when it cannot be read. A
 * username that will not load is a real problem worth stopping for; a survey
 * that will not load is a form standing between somebody and the thing they
 * came for, with a Skip button that would fail for the same reason. So an
 * unreadable record lets the app through rather than holding it.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, username, usernameLoading } = useAuth();
  const router = useRouter();

  // Stamped with the uid it belongs to, the same way the username is in
  // `auth-context`: clearing it in an effect on the way out would set state
  // during render, and one account's record must never be read as another's.
  const [survey, setSurvey] = useState<{
    uid: string;
    state: SurveyState;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return watchSurvey(uid, (state) => setSurvey({ uid, state }));
  }, [user]);

  const mine = user && survey?.uid === user.uid ? survey.state : null;

  if (loading || (user && usernameLoading)) return <Waiting />;

  if (!user) return null;
  if (!username) return <UsernameGate />;

  if (mine === null) return <Waiting />;
  if (mine.status === "none") return <SurveyGate uid={user.uid} />;

  return <>{children}</>;
}

function Waiting() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
        Loading
      </p>
    </div>
  );
}
