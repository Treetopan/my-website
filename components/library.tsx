"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DIFFICULTY,
  SUBJECTS,
  canDuel,
  isStocked,
  hasContent,
  stockLabel,
  subunitStockLabel,
  subunitsOf,
  type Course,
  type Subject,
  type Subunit,
  type Unit,
} from "@/lib/curriculum";
import { MAX_SUBUNITS, encodeSelection } from "@/lib/selection";
import { spatialGenerators } from "@/lib/templates";

type GameId = "racer" | "last-one-standing" | "mirror";

const GAMES: { id: GameId; name: string; blurb: string; meta: string }[] = [
  {
    id: "racer",
    name: "Racer",
    blurb: "Answer to move. Every correct answer puts road between you and the bot.",
    meta: "1 player vs bot · ~4 min",
  },
  {
    id: "mirror",
    name: "Mirror Duel",
    blurb:
      "The same question, both of you at once. The closer answer takes the gap between them.",
    meta: "2 players · answers placed on a grid · ~3 min",
  },
  {
    id: "last-one-standing",
    name: "Last One Standing",
    blurb: "Three players, one wrong answer each. The room empties until one is left.",
    meta: "3 players · ~6 min",
  },
];

/** Where each game lives. Kept beside the list so adding one means one place. */
const PATHS: Record<GameId, string> = {
  racer: "/play/racer",
  mirror: "/play/duel",
  "last-one-standing": "/play/room",
};

const LAUNCH: Record<GameId, string> = {
  racer: "Start Racer",
  mirror: "Open a duel",
  "last-one-standing": "Open a room",
};

/** "1 unit", "3 units" — the library counts a lot of things. */
function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export function Library() {
  const router = useRouter();

  const [game, setGame] = useState<GameId | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  /**
   * The subunits to play, in the order the unit lists them rather than the
   * order they were tapped — the launch bar reads as the syllabus does.
   */
  const [picked, setPicked] = useState<Subunit[]>([]);

  /**
   * A duel is won by whichever answer was closer, so it can only be played
   * where the answer is placed on a grid or a scale rather than typed or
   * chosen. That narrows every list below it, which is why the rule lives up
   * here rather than in each step.
   */
  const duelling = game === "mirror";
  const offerable = (su: Subunit) => (duelling ? canDuel(su) : hasContent(su));

  function chooseGame(next: GameId) {
    setGame(next);
    // A subunit that suited the last game may not suit this one. Everything
    // above it still does, so only the choices that have actually stopped
    // being valid are dropped, one by one rather than all of them.
    if (next === "mirror") setPicked((prev) => prev.filter(canDuel));
  }

  /**
   * Picking a subunit is a toggle, because a session mixes several. The cap is
   * held here rather than by disabling the rest: it is the tap that is
   * refused, and the row says why it is refused before you reach for it.
   */
  function toggleSubunit(su: Subunit) {
    setPicked((prev) => {
      if (prev.some((s) => s.id === su.id)) {
        return prev.filter((s) => s.id !== su.id);
      }
      if (prev.length >= MAX_SUBUNITS) return prev;
      const next = [...prev, su];
      return unit ? unit.subunits.filter((s) => next.includes(s)) : next;
    });
  }

  // Each choice invalidates everything downstream of it — a stale unit from a
  // different course is the one bug this screen could easily ship with.
  function chooseSubject(next: Subject) {
    setSubject(next);
    setCourse(null);
    setUnit(null);
    setPicked([]);
  }

  function chooseCourse(next: Course) {
    setCourse(next);
    setUnit(null);
    setPicked([]);
  }

  function chooseUnit(next: Unit) {
    setUnit(next);
    setPicked([]);
  }

  const ready = game !== null && picked.length > 0;
  const full = picked.length >= MAX_SUBUNITS;

  function start() {
    if (!ready) return;
    router.push(`${PATHS[game]}?s=${encodeSelection(picked.map((su) => su.id))}`);
  }

  // What the launch bar says. A single subunit still states its difficulty and
  // its clock; a mix has neither to state, so it says how many were taken.
  const only = picked.length === 1 ? picked[0] : null;
  const summary = [
    subject?.name,
    course?.name,
    picked.map((su) => su.code).join(" + "),
    only ? DIFFICULTY[only.difficulty].name : count(picked.length, "subunit"),
    only ? `${DIFFICULTY[only.difficulty].seconds}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-14 pb-24">
      <Step n="01" title="Choose a game">
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => (
            <Card
              key={g.id}
              on={game === g.id}
              onClick={() => chooseGame(g.id)}
              title={g.name}
              body={g.blurb}
              foot={g.meta}
            />
          ))}
        </div>
      </Step>

      <Step n="02" title="Choose a subject">
        <div className="grid gap-3 sm:grid-cols-3">
          {SUBJECTS.map((s) => {
            // A subject with no courses has nothing to walk down into, so it
            // is shown and disabled rather than hidden — it says what is
            // coming without pretending to be pickable.
            const soon = s.courses.length === 0;
            return (
              <Card
                key={s.id}
                on={subject?.id === s.id}
                disabled={soon}
                onClick={() => !soon && chooseSubject(s)}
                title={s.name}
                body={s.blurb}
                foot={soon ? "Coming soon" : undefined}
              />
            );
          })}
        </div>
      </Step>

      {subject && (
        <Step n="03" title="Choose a course">
          <div className="grid gap-3 sm:grid-cols-2">
            {subject.courses.map((c) => {
              const duellable = subunitsOf(c).filter(canDuel).length;
              const stocked = duelling ? duellable > 0 : isStocked(c);
              const units = count(c.units.length, "unit");
              return (
                <Card
                  key={c.id}
                  on={course?.id === c.id}
                  disabled={!stocked}
                  onClick={() => stocked && chooseCourse(c)}
                  title={c.name}
                  body={c.blurb}
                  foot={
                    duelling
                      ? duellable > 0
                        ? `${count(duellable, "subunit")} to duel on`
                        : `${units} · nothing answered on a grid`
                      : stocked
                        ? stockLabel(c)
                        : `${units} · no questions yet`
                  }
                />
              );
            })}
          </div>
        </Step>
      )}

      {course && (
        <Step n="04" title="Choose a unit">
          <div className="flex flex-col gap-2.5">
            {course.units.map((u) => {
              const playable = u.subunits.filter(offerable).length;
              return (
              <Row
                key={u.id}
                on={unit?.id === u.id}
                disabled={playable === 0}
                onClick={() => playable > 0 && chooseUnit(u)}
                label={u.name}
                lead={u.code.replace("unit-", "Unit ")}
                meta={
                  playable === u.subunits.length
                    ? `${u.subunits.length} subunits`
                    : `${playable}/${u.subunits.length} subunits ready`
                }
              />
              );
            })}
          </div>
        </Step>
      )}

      {unit && (
        <Step
          n="05"
          title="Choose what to practise"
          note={`Take up to ${MAX_SUBUNITS} subunits. They are dealt in turn into one session, so a mix is one game rather than several.`}
        >
          <div className="flex flex-col gap-2.5">
            {unit.subunits.map((su) => {
              const d = DIFFICULTY[su.difficulty];
              const ready = offerable(su);
              const on = picked.some((s) => s.id === su.id);
              // Held back by the cap rather than by having nothing to ask, and
              // the meta says which — a row that is simply dimmed reads as broken.
              const blocked = full && !on;
              const placed = spatialGenerators(su.id).length;
              return (
                <Row
                  key={su.id}
                  multi
                  on={on}
                  disabled={!ready || blocked}
                  onClick={() => ready && toggleSubunit(su)}
                  label={su.name}
                  lead={su.code}
                  meta={
                    !ready
                      ? duelling && hasContent(su)
                        ? "typed or chosen answers only"
                        : "nothing to ask yet"
                      : blocked
                        ? `${MAX_SUBUNITS} already picked`
                        : duelling
                          ? `${count(placed, "generator")} · answered on a grid`
                          : subunitStockLabel(su)
                  }
                  tag={d.name}
                  tagNote={`${d.note} · ${d.seconds}s a question`}
                />
              );
            })}
          </div>
        </Step>
      )}

      {/* The launch bar states the whole selection, because by step five the
          earlier choices have scrolled off the top of the screen. */}
      <div className="flex flex-wrap items-center gap-4 border-t border-line-soft pt-7">
        <button
          type="button"
          onClick={start}
          disabled={!ready}
          className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
        >
          {game ? LAUNCH[game] : "Start"}
        </button>

        <p className="font-mono text-[11px] text-faint tnum">
          {ready ? summary : "Pick a game and work down to a subunit or four"}
        </p>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  /** A line under the heading, for a step whose rule is not self-evident. */
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col border-t border-line-soft pt-8 pb-10 first:border-t-0 first:pt-0">
      <span className="eyebrow">Step {n}</span>
      <h2 className="mt-2 text-[22px] font-medium tracking-[-0.02em]">
        {title}
      </h2>
      {note && <p className="mt-2 text-[13px] text-faint">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Card({
  on,
  disabled,
  onClick,
  title,
  body,
  foot,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  body: string;
  foot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={[
        "box flex h-full flex-col gap-1.5 p-5 text-left",
        disabled ? "cursor-not-allowed opacity-45" : on ? "box-on" : "box-tap",
      ].join(" ")}
    >
      <span className="text-[16px] font-medium tracking-[-0.012em] text-ink">
        {title}
      </span>
      <span className="text-[12.5px] text-faint">{body}</span>
      {foot && (
        <span className="mt-1 font-mono text-[11px] text-faint tnum">{foot}</span>
      )}
    </button>
  );
}

function Row({
  on,
  multi,
  disabled,
  onClick,
  lead,
  label,
  meta,
  tag,
  tagNote,
}: {
  on: boolean;
  /** One of several that can be on at once, so it carries a box to tick. */
  multi?: boolean;
  disabled?: boolean;
  onClick: () => void;
  lead: string;
  label: string;
  meta: string;
  tag?: string;
  tagNote?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={[
        "box flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-left",
        on ? "box-on" : disabled ? "opacity-45" : "box-tap",
        disabled ? "cursor-not-allowed" : "",
      ].join(" ")}
    >
      {multi && (
        <span
          aria-hidden
          className={[
            "flex size-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] leading-none",
            on
              ? "border-accent bg-accent text-accent-ink"
              : "border-line text-transparent",
          ].join(" ")}
        >
          ✓
        </span>
      )}
      <span className="font-mono text-[11px] text-faint tnum">{lead}</span>
      <span className="flex-1 text-[14.5px] text-ink">{label}</span>

      {tag && (
        <span
          title={tagNote}
          className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase"
        >
          {tag}
        </span>
      )}

      <span className="font-mono text-[11px] text-faint tnum">{meta}</span>
    </button>
  );
}
