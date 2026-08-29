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
  const [subunit, setSubunit] = useState<Subunit | null>(null);

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
    // above it still does, so only the choice that has actually stopped being
    // valid is dropped.
    if (subunit && next === "mirror" && !canDuel(subunit)) setSubunit(null);
  }

  // Each choice invalidates everything downstream of it — a stale unit from a
  // different course is the one bug this screen could easily ship with.
  function chooseSubject(next: Subject) {
    setSubject(next);
    setCourse(null);
    setUnit(null);
    setSubunit(null);
  }

  function chooseCourse(next: Course) {
    setCourse(next);
    setUnit(null);
    setSubunit(null);
  }

  function chooseUnit(next: Unit) {
    setUnit(next);
    setSubunit(null);
  }

  const ready = game !== null && subunit !== null;

  function start() {
    if (!ready) return;
    const s = encodeURIComponent(subunit.id);
    router.push(`${PATHS[game]}?s=${s}`);
  }

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
        <Step n="05" title="Choose a subunit">
          <div className="flex flex-col gap-2.5">
            {unit.subunits.map((su) => {
              const d = DIFFICULTY[su.difficulty];
              const ready = offerable(su);
              const placed = spatialGenerators(su.id).length;
              return (
                <Row
                  key={su.id}
                  on={subunit?.id === su.id}
                  disabled={!ready}
                  onClick={() => ready && setSubunit(su)}
                  label={su.name}
                  lead={su.code}
                  meta={
                    duelling
                      ? ready
                        ? `${count(placed, "generator")} · answered on a grid`
                        : hasContent(su)
                          ? "typed or chosen answers only"
                          : "nothing to ask yet"
                      : ready
                        ? subunitStockLabel(su)
                        : "nothing to ask yet"
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
          {ready
            ? [
                subject?.name,
                course?.name,
                subunit?.code,
                `${DIFFICULTY[subunit.difficulty].name}`,
                `${DIFFICULTY[subunit.difficulty].seconds}s`,
              ].join(" · ")
            : "Pick a game and work down to a subunit"}
        </p>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col border-t border-line-soft pt-8 pb-10 first:border-t-0 first:pt-0">
      <span className="eyebrow">Step {n}</span>
      <h2 className="mt-2 mb-5 text-[22px] font-medium tracking-[-0.02em]">
        {title}
      </h2>
      {children}
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
  disabled,
  onClick,
  lead,
  label,
  meta,
  tag,
  tagNote,
}: {
  on: boolean;
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
