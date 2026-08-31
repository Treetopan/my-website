"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  addAdmin,
  readAdminData,
  removeAdmin,
  useAdmin,
  watchAdmins,
  type AdminData,
  type AdminEntry,
} from "@/lib/admin";
import {
  SURVEY,
  tally,
  type SurveyQuestion,
  type SurveyRecord,
} from "@/lib/survey";
import {
  flagFeedback,
  removeFeedback,
  watchFeedback,
  type FeedbackNote,
} from "@/lib/feedback";
import { USERNAME_MAX } from "@/lib/username";

/**
 * The admin area: how many accounts there are, what they said on the way in,
 * and who else can see this screen.
 *
 * The survey section is generated from the survey's own declaration in
 * `survey.ts` rather than written out question by question, so a question added
 * there appears here counted, in the order it is asked, without this file
 * changing. That is the whole reason the survey is declared rather than built.
 *
 * What is *not* here is as deliberate: no list of accounts, no addresses, no
 * per-player session history, no way to act on somebody's account. Accounts are
 * counts — how many exist, how many came back, how many played this week — and
 * an answer is what somebody said rather than who said it. The question this
 * screen exists to answer is how the beta is going, and none of that is needed
 * to answer it. The rest is private to the player under the database rules,
 * and this screen asks for nothing the rules would refuse: a dashboard whose
 * rows half-load is worse than one that never promised them.
 */
export function Admin() {
  const { user, username } = useAuth();
  const { isAdmin, isOwner, loading } = useAdmin();

  const [data, setData] = useState<AdminData | null>(null);
  // The sentence a failed read gave, not just that it failed: the accounts
  // come from a route that can say why it refused, and "couldn't read them"
  // is no help when the answer is a missing service account.
  const [problem, setProblem] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Read once rather than watched. Everything here is a count over every
  // account in the app, and a standing listener on that node would re-tally the
  // whole screen every time anybody anywhere earned XP. Refresh is a button
  // instead, which also makes it obvious how old the numbers are.
  useEffect(() => {
    if (!isAdmin) return;

    let live = true;
    readAdminData().then(
      (next) => {
        if (!live) return;
        setData(next);
        setProblem(null);
      },
      (error: unknown) => live && setProblem(sentence(error)),
    );

    return () => {
      live = false;
    };
  }, [isAdmin]);

  async function refresh() {
    setRefreshing(true);
    try {
      setData(await readAdminData());
      setProblem(null);
    } catch (error) {
      setProblem(sentence(error));
    } finally {
      setRefreshing(false);
    }
  }

  const reading = refreshing || (isAdmin && !data && !problem);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Loading
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-24">
        <h1 className="text-[32px] font-semibold tracking-[-0.035em]">
          Nothing here
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          This area is for admins.{" "}
          <Link href="/" className="text-accent hover:text-accent-hi">
            Back to the library.
          </Link>
        </p>
      </main>
    );
  }

  // The records that carry answers, which is what every tally below counts.
  // A skip has its own tile and must not sit in the denominator of a question
  // nobody was ever shown.
  const answered = data?.answered ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-14 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em]">
            {data ? `${data.accounts.toLocaleString()} accounts` : "Accounts"}
          </h1>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={reading}
          className="rounded-sm border border-line px-3.5 py-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase transition-colors hover:border-accent hover:text-accent disabled:border-line-soft disabled:text-faint"
        >
          {reading ? "Reading…" : "Refresh"}
        </button>
      </div>

      {problem && (
        <p
          role="alert"
          className="mt-6 rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
        >
          {problem}
        </p>
      )}

      {/* ── Counts ──────────────────────────────────────── */}
      <section className="mt-9 border-t border-line-soft pt-8">
        {/* Accounts first, then what they did with them, all of them counts
            over the same two nodes, read and dropped — see `readAdminData`.
            The last tile is the odd one out and is here for the same reason
            anything is on a dashboard: it is a fault that shows up nowhere
            else until it costs somebody a game. */}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Accounts" value={num(data?.accounts)} accent />
          <Stat label="Never played" value={num(data?.neverPlayed)} />
          <Stat label="Came back" value={num(data?.cameBack)} />
          <Stat label="Active this week" value={num(data?.activeThisWeek)} />
          <Stat label="Named" value={num(data?.named)} />
          <Stat label="Answered" value={num(data?.answered.length)} />
          <Stat label="Skipped" value={num(data?.skipped)} />
          <Stat
            label="Session store"
            value={
              data ? (data.sessionsShared ? "Firebase" : "In memory") : "—"
            }
            note={data && data.sessionsShared === false ? "fallback" : undefined}
            warn={data?.sessionsShared === false}
          />
        </dl>

        {data?.sessionsShared === false && (
          <p
            role="alert"
            className="mt-3.5 rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
          >
            Grading sessions are being kept in one server&apos;s memory, because
            it has no <code className="font-mono text-[12px]">FIREBASE_SERVICE_ACCOUNT</code>{" "}
            to reach the database with. That is fine on a single instance and
            broken on more than one: a game opened on one server and graded by
            another is graded by a server that never saw it, and the player gets
            an error halfway through a race.
          </p>
        )}

        {data && data.accounts > 0 && (
          <div className="mt-3.5 flex flex-col gap-1.5 text-[13.5px] text-faint">
            <p>
              {pct(data.cameBack, data.accounts)} of accounts played a second
              session; {pct(data.neverPlayed, data.accounts)} have not finished
              one. A second session is the only one anybody chose twice, which
              makes it the number worth watching.
            </p>
            <p>
              {pct(data.answered.length, data.accounts)} answered the survey;{" "}
              {pct(
                data.accounts - data.answered.length - data.skipped,
                data.accounts,
              )}{" "}
              have not been asked yet or have not finished signing in.
            </p>
          </div>
        )}
      </section>

      {/* ── The survey ──────────────────────────────────── */}
      <section className="border-t border-line-soft pt-8 pb-10">
        <h2 className="text-[22px] font-medium tracking-[-0.02em]">Survey</h2>
        <p className="mt-2 mb-6 text-[13.5px] text-faint">
          {answered.length === 0
            ? "Nobody has answered yet."
            : `${answered.length} ${answered.length === 1 ? "person has" : "people have"} answered. Percentages are of the people who answered that question, not of all accounts.`}
        </p>

        <div className="flex flex-col gap-8">
          {SURVEY.map((question) =>
            question.kind === "text" ? (
              <FreeText
                key={question.id}
                question={question}
                records={answered}
              />
            ) : (
              <Tally
                key={question.id}
                question={question}
                records={answered}
              />
            ),
          )}
        </div>
      </section>

      {/* ── Feedback ────────────────────────────────────── */}
      <Feedback />

      {/* ── Admins ──────────────────────────────────────── */}
      <Admins me={username} isOwner={isOwner} meUid={user?.uid ?? null} />
    </main>
  );
}

// ─── Survey readouts ─────────────────────────────────────

function Tally({
  question,
  records,
}: {
  question: SurveyQuestion;
  records: SurveyRecord[];
}) {
  const { rows, answered } = tally(question, records);
  const top = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-[15.5px] font-medium">{question.prompt}</h3>
        <span className="shrink-0 font-mono text-[11px] text-faint tnum">
          {answered} answered
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.value} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-[13.5px] text-muted">
              {row.label}
            </span>

            {/* The bar is scaled to the largest answer rather than to the
                total, so a question where everything lands on one option still
                shows the shape of the rest instead of a row of slivers. */}
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full origin-left rounded-full bg-accent transition-transform duration-500"
                style={{ transform: `scaleX(${row.count / top})` }}
              />
            </span>

            <span className="w-20 shrink-0 text-right font-mono text-[11px] text-faint tnum">
              {row.count} · {pct(row.count, answered)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Free text, shown whole. It is the one answer that cannot be counted, so it is
 * the one that is read.
 *
 * Unattributed, now that the accounts are only a number here: an answer to a
 * survey question is a thing somebody said, and the screen has no business
 * knowing which account said it. Anybody with something to say to whoever runs
 * this can say it in the feedback below, where it does come with a name —
 * because they chose to write it.
 */
function FreeText({
  question,
  records,
}: {
  question: SurveyQuestion;
  records: SurveyRecord[];
}) {
  const said = records
    .map((record) => record.answers?.[question.id])
    .filter((text): text is string => Boolean(text));

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-[15.5px] font-medium">{question.prompt}</h3>
        <span className="shrink-0 font-mono text-[11px] text-faint tnum">
          {said.length} written
        </span>
      </div>

      {said.length === 0 ? (
        <p className="text-[13.5px] text-faint">Nothing written yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {said.map((text, i) => (
            <li key={i} className="box px-4 py-3.5">
              <p className="text-[14.5px] whitespace-pre-wrap">{text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Feedback ────────────────────────────────────────────

/**
 * What people have written from the bubble in the top bar.
 *
 * Watched rather than read with the rest of the screen: the counts are a
 * snapshot with a Refresh button beside them because re-tallying every account
 * on every write would be silly, and a note is the opposite — there are few of
 * them, they arrive one at a time, and one arriving while somebody has this
 * page open should appear.
 *
 * There is no name on any of them, by design and not by omission — see
 * `feedback.ts`. What is on the screen is what somebody said and when.
 *
 * Three things can be done with a note, and two of them are the same write.
 * Resolved and Delete both take it off the list, because there is nobody to
 * tell either way and a note that stays after it has been dealt with turns
 * this into a list that only grows; they are separate buttons because pressing
 * one of them means you did something about it and pressing the other means
 * you did not, and that is worth being able to say to yourself. Flag is the
 * one that keeps it: it holds the note at the top for the ones worth coming
 * back to before they are lost among the rest.
 */
function Feedback() {
  const [notes, setNotes] = useState<FeedbackNote[]>([]);

  useEffect(() => watchFeedback(setNotes), []);

  const flagged = notes.filter((note) => note.flagged).length;

  return (
    <section className="border-t border-line-soft pt-8 pb-10">
      <h2 className="text-[22px] font-medium tracking-[-0.02em]">Feedback</h2>
      <p className="mt-2 mb-5 text-[13.5px] text-faint">
        Anonymous, and readable by admins only. Flagged first, then newest.
        {flagged > 0 && ` ${flagged} flagged.`}
      </p>

      {notes.length === 0 ? (
        <p className="text-[14px] text-faint">Nothing sent yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className={`box px-4 py-3.5 ${
                note.flagged ? "border-accent bg-accent/6" : ""
              }`}
            >
              <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">
                {note.text}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint uppercase tnum">
                  {note.at ? dayOf(note.at) : "—"}
                </span>

                {note.flagged && (
                  <span className="eyebrow text-accent">Flagged</span>
                )}

                <span className="ml-auto flex items-center gap-4">
                  <Choice onClick={() => removeFeedback(note.id)}>
                    Resolved
                  </Choice>
                  <Choice
                    onClick={() => flagFeedback(note.id, !note.flagged)}
                    accent={!note.flagged}
                  >
                    {note.flagged ? "Unflag" : "Flag"}
                  </Choice>
                  <Choice onClick={() => removeFeedback(note.id)} out>
                    Delete
                  </Choice>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One of the three things an admin can do to a note. */
function Choice({
  children,
  onClick,
  accent,
  out,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  out?: boolean;
}) {
  const tone = out
    ? "hover:text-out"
    : accent
      ? "hover:text-accent"
      : "hover:text-ink";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-[10.5px] tracking-[0.1em] text-faint uppercase transition-colors ${tone}`}
    >
      {children}
    </button>
  );
}

// ─── Who else gets in ────────────────────────────────────

/**
 * The roster, and the form that adds to it.
 *
 * Adding is by username because that is the only handle this app asks anybody
 * to remember, and it is already the index a player is looked up through — the
 * person being added does not have to do anything, and does not have to hand
 * over their email to be found.
 */
function Admins({
  me,
  meUid,
  isOwner,
}: {
  me: string | null;
  meUid: string | null;
  isOwner: boolean;
}) {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [wanted, setWanted] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => watchAdmins(setAdmins), []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!me || busy) return;

    setBusy(true);
    setNote(null);
    const result = await addAdmin({ username: me }, wanted);
    setBusy(false);

    if (!result.ok) {
      setNote({ ok: false, text: result.problem });
      return;
    }
    setNote({ ok: true, text: `${result.username} can now see this area.` });
    setWanted("");
  }

  return (
    <section className="border-t border-line-soft pt-8">
      <h2 className="text-[22px] font-medium tracking-[-0.02em]">
        Who can see this
      </h2>
      <p className="mt-2 mb-5 text-[13.5px] text-faint">
        An admin sees everything on this page and can add other admins. The
        owner&apos;s account holds admin by email and is not listed here, so
        there is no way to lock everybody out.
      </p>

      <form onSubmit={add} className="flex gap-2.5">
        <input
          value={wanted}
          onChange={(e) => setWanted(e.target.value)}
          maxLength={USERNAME_MAX}
          autoComplete="off"
          placeholder="username"
          className="box flex-1 px-3.5 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || wanted.trim().length < 3}
          className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
        >
          {busy ? "Adding…" : "Add admin"}
        </button>
      </form>

      {note && (
        <p
          role="status"
          className={`mt-3 text-[13px] ${note.ok ? "text-accent" : "text-out"}`}
        >
          {note.text}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2.5">
        {admins.length === 0 && (
          <li className="text-[14px] text-faint">
            Nobody has been added. Only the owner can see this page.
          </li>
        )}

        {admins.map((admin) => (
          <li
            key={admin.uid}
            className="box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5"
          >
            <span className="flex-1 text-[14.5px]">
              {admin.username}
              {admin.uid === meUid && (
                <span className="ml-2 font-mono text-[10.5px] text-faint">
                  you
                </span>
              )}
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-faint uppercase">
              added by {admin.addedBy ?? "—"}
            </span>
            {isOwner && (
              <button
                type="button"
                onClick={() => removeAdmin(admin.uid)}
                className="text-[13px] text-faint transition-colors hover:text-out"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Small pieces ────────────────────────────────────────

function Stat({
  label,
  value,
  note,
  accent,
  warn,
}: {
  label: string;
  value: string;
  /** A word under the value, for a tile that is a state rather than a count. */
  note?: string;
  accent?: boolean;
  /** A value that is not a problem to read about but a problem to have. */
  warn?: boolean;
}) {
  const tone = warn ? "text-out" : accent ? "text-accent" : "text-ink";

  return (
    <div
      className={`box flex flex-col gap-1.5 px-4 py-3 ${
        warn ? "border-out/50 bg-out/8" : ""
      }`}
    >
      <dt className="eyebrow">{label}</dt>
      <dd className={`font-mono text-xl tnum ${tone}`}>
        {value}
        {note && (
          <span className="ml-1.5 font-mono text-[11px] tracking-[0.1em] uppercase">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}

/** Whatever went wrong, as something worth putting on the screen. */
function sentence(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Couldn't count the accounts.";
}

function num(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

/** Rounded, and never rounded to a whole share it has not actually reached. */
function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  const share = (part / whole) * 100;
  if (share > 0 && share < 1) return "<1%";
  if (share < 100 && share > 99) return ">99%";
  return `${Math.round(share)}%`;
}

function dayOf(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
