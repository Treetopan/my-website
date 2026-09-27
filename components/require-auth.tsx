"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { UsernameGate } from "@/components/username-gate";
import { CourseGate } from "@/components/course-gate";
import { SurveyGate } from "@/components/survey-gate";
import { watchSurvey, type SurveyState } from "@/lib/survey";
import { watchCourse, type CourseChoice } from "@/lib/account";

/**
 * Client-side gate. Firebase Auth holds its session in IndexedDB, so the
 * server has no view of it without the Admin SDK and a session cookie — this
 * is the honest boundary for an RTDB app. The database rules are what actually
 * protect data; this only decides what the UI shows.
 *
 * It gates on four things in order, each one a prerequisite of the next:
 *
 *  1. **Signed in.** Everything below needs a uid. Somebody without one is
 *     sent to `/signup` rather than `/login`, because almost anybody who
 *     reaches a gated screen without an account has just followed a link
 *     from somebody who has one. The few who are returning are one small
 *     link away, and `/` shows them the landing page rather than either.
 *  2. **Named.** A player with no username cannot be added as a friend, cannot
 *     be invited, and sits at the table as a blank — so the name is asked for
 *     here, once, rather than checked for again on every screen that needs it.
 *  3. **Placed.** Which maths they are taking, which is the one answer here
 *     that changes what the app then does — Quick play offers their course and
 *     the library opens on it. Before the survey rather than after, because it
 *     is the question with a consequence and the survey is seven that have
 *     none; and because the survey's own course question can then open already
 *     filled in rather than asking the same thing over again.
 *  4. **Asked.** The survey, which is only ever shown to somebody who has just
 *     arrived. It is a gate in position only: skipping costs one press, and
 *     skipping is recorded, so nobody meets it twice.
 *
 * The last two are the ones that yield when they cannot be read. A username
 * that will not load is a real problem worth stopping for; a form standing
 * between somebody and the thing they came for, with a Skip button that would
 * fail for the same reason, is not. So an unreadable record lets the app
 * through rather than holding it.
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
  const [course, setCourse] = useState<{
    uid: string;
    choice: CourseChoice;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return watchSurvey(uid, (state) => setSurvey({ uid, state }));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return watchCourse(uid, (choice) => setCourse({ uid, choice }));
  }, [user]);

  const mine = user && survey?.uid === user.uid ? survey.state : null;
  const myCourse = user && course?.uid === user.uid ? course.choice : null;

  if (loading || (user && usernameLoading)) return <Waiting />;

  if (!user) return null;
  if (!username) return <UsernameGate />;

  if (myCourse === null || myCourse.status === "loading") return <Waiting />;
  if (myCourse.status === "unasked") return <CourseGate uid={user.uid} />;

  if (mine === null) return <Waiting />;
  if (mine.status === "none") {
    return (
      <SurveyGate
        uid={user.uid}
        // The survey asks which course they are working on first, and they have
        // just said. Seeding it means the question is confirmed rather than
        // asked twice — and the tally an admin reads keeps counting, which
        // dropping the question would have stopped.
        initial={
          myCourse.status === "chosen"
            ? { course: myCourse.courseId }
            : undefined
        }
      />
    );
  }

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
