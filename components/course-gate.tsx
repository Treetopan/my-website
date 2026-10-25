"use client";

import { useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { courseChoices } from "@/lib/curriculum";
import { setCourse, skipCourse } from "@/lib/account";

/**
 * The one question asked on the way in that changes what the app does.
 *
 * It asks for the course, not the school year, because the school year does not
 * answer it: two students in the same 9th grade can be in Algebra 1 and in
 * Precalculus, and the app has nothing to do with the year — it has ten courses
 * and needs to know which one. So the prompt names the thing it wants and the
 * options are the course names themselves, which is also the shortest possible
 * route to an answer somebody can give without translating.
 *
 * It is a gate in position only, exactly as the survey is. Skipping costs one
 * press and is recorded, so nobody meets this twice, and a student who skips
 * gets the same app anybody had before this screen existed — Quick play guesses
 * at Algebra 1 and the library opens at the top. Nothing is withheld for not
 * answering; the answer only saves choices later.
 */
export function CourseGate({ uid }: { uid: string }) {
  const courses = courseChoices();
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "skip" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(what: "save" | "skip") {
    if (busy) return;
    setBusy(what);
    setProblem(null);

    try {
      if (what === "skip" || !picked) await skipCourse(uid);
      else await setCourse(uid, picked);
      // Nothing to do on success: the gate watches the record it just wrote,
      // so the write itself is what takes this screen down.
    } catch {
      setProblem("That didn't save. Check your connection and try again.");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-14 pb-32">
      <Wordmark className="mb-12" />

      <p className="eyebrow">Your course</p>
      <h1 className="mt-2 text-[32px] leading-tight font-semibold tracking-[-0.035em]">
        Which maths are you taking?
      </h1>
      <p className="mt-2.5 text-[15px] text-muted">
        It sets what Quick play offers and where the library opens. You can
        change it any time from your profile.
      </p>

      <div className="mt-9">
        <CourseChips
          courses={courses}
          value={picked}
          disabled={busy !== null}
          onPick={setPicked}
        />
      </div>

      {problem && (
        <p
          role="alert"
          className="mt-8 rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
        >
          {problem}
        </p>
      )}

      {/* Skip beside Continue rather than under it, and a button rather than
          fine print — the whole point is that it costs the same one press. */}
      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line-soft pt-7">
        <button
          type="button"
          onClick={() => run("save")}
          disabled={busy !== null || !picked}
          className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
        >
          {busy === "save" ? "Saving…" : "Continue"}
        </button>

        <button
          type="button"
          onClick={() => run("skip")}
          disabled={busy !== null}
          className="text-[13px] text-faint transition-colors hover:text-ink disabled:text-line"
        >
          {busy === "skip" ? "Skipping…" : "Skip this"}
        </button>
      </div>
    </main>
  );
}

/**
 * The ten course names as chips, in the order the syllabus runs.
 *
 * Shared with the profile so that changing your course later is the same
 * gesture as picking it in the first place — and so there is one list, not two
 * that can disagree. Pressing the chip already on clears it, the same way the
 * survey's chips do: an answer given by accident can be taken back rather than
 * only changed.
 */
export function CourseChips({
  courses,
  value,
  disabled,
  onPick,
}: {
  courses: { id: string; name: string }[];
  value: string | null;
  disabled?: boolean;
  onPick: (courseId: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {courses.map((course) => {
        const on = value === course.id;
        return (
          <button
            key={course.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(on ? null : course.id)}
            className={`box box-tap px-3.5 py-2 text-[13.5px] disabled:cursor-not-allowed ${
              on ? "box-on text-accent" : "text-muted"
            }`}
          >
            {course.name}
          </button>
        );
      })}
    </div>
  );
}
