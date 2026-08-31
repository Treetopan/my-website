import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

/**
 * What a signed-out visitor sees at `/`.
 *
 * Almost everybody who lands here arrived from a link somebody sent them and
 * has never heard the name, so this screen has one job: say what the site is
 * before asking for an email. It is built out of the same parts as the auth
 * pages — same column width, same wordmark, same heading and button — because
 * the next tap goes straight to `/signup`, and the two screens should read as
 * one product rather than a front page and a form.
 *
 * The two games are described, not sold. Each line is the mechanic the library
 * already states for that mode, so nothing here is a promise the game does not
 * keep.
 */
export function Landing() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-14">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-10" />

        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.035em]">
          Students racing each other through math questions.
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          Pick a course, pick the unit you are working on, and play somebody
          through it.
        </p>

        <dl className="mt-8 flex flex-col gap-4">
          <Game
            name="Racer"
            body="Head to head. Every correct answer puts road between your car and theirs."
          />
          <Game
            name="Last One Standing"
            body="Turn by turn. A wrong answer puts you out for the round, and the clock gets shorter every lap of the table."
          />
        </dl>

        <p className="mt-7 font-mono text-[11px] text-faint">
          Math · Grade 5 through AP Calculus BC
        </p>

        <Link
          href="/signup"
          className="mt-8 block rounded-sm bg-accent px-4.5 py-2.5 text-center text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
        >
          Create an account
        </Link>

        <p className="mt-6 text-[13px] text-faint">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent transition-colors hover:text-accent-hi"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Game({ name, body }: { name: string; body: string }) {
  return (
    <div>
      <dt className="text-[16px] font-medium tracking-[-0.012em] text-ink">
        {name}
      </dt>
      <dd className="mt-1 text-[13px] text-muted">{body}</dd>
    </div>
  );
}
