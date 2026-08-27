/**
 * Usernames: what makes one legal, and what makes one unacceptable.
 *
 * A username is not a display name. It is claimed once, it is unique across the
 * whole app, and it is how one player finds another to add as a friend — so it
 * has to be typeable, comparable, and safe to show to a room full of students.
 *
 * This file is shared between the sign-up form, the profile gate and the friend
 * search, because all three have to agree on what a name *is*. It holds no
 * secrets and does no I/O; claiming a name is `claimUsername` in `rtdb.ts`, and
 * the database rules are what actually enforce shape and uniqueness.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;

/**
 * The shape rule, as the database also states it. Letters, digits and
 * underscores; a letter first, so a name can never be read as a number or as an
 * internal key, and no two names differ only by leading punctuation.
 */
const SHAPE = /^[A-Za-z][A-Za-z0-9_]{2,15}$/;

/**
 * The lookup key: the name lowercased.
 *
 * Names are stored and compared by this, so `Mara` and `mara` are one name
 * rather than two and nobody can impersonate a friend by re-casing them. What
 * is displayed is still whatever the owner typed.
 */
export function usernameKey(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── The words a name may not contain ────────────────────

/**
 * Written flat rather than as a clever pattern. A regex that catches everything
 * catches half the alphabet with it, and the failure people actually meet is
 * the false positive: a student called Cassie being told her name is offensive
 * is a worse outcome than a rude name reaching a teacher's report.
 *
 * Matched against the *normalised* name, so the usual substitutions — zero for
 * o, dollar for s, an underscore between every letter — do not get round them.
 */
const BANNED = [
  "anal",
  "anus",
  "arse",
  "ass",
  "bastard",
  "bitch",
  "blowjob",
  "bollock",
  "boner",
  "boob",
  "clit",
  "cock",
  "coon",
  "crap",
  "cum",
  "cunt",
  "dick",
  "dildo",
  "dyke",
  "fag",
  "fuck",
  "gook",
  "handjob",
  "hentai",
  "hitler",
  "horny",
  "incest",
  "jizz",
  "kike",
  "kys",
  "milf",
  "molest",
  "nazi",
  "nigg",
  "nutsack",
  "orgasm",
  "orgy",
  "paki",
  "pedo",
  "penis",
  "piss",
  "porn",
  "prick",
  "pussy",
  "queer",
  "rape",
  "rapist",
  "retard",
  "scrotum",
  "semen",
  "sex",
  "shit",
  "slut",
  "spunk",
  "tits",
  "titty",
  "twat",
  "vagina",
  "wank",
  "whore",
];

/**
 * Names the app itself answers to. Not offensive — impersonating, which is the
 * other half of what this check is for.
 */
const RESERVED = [
  "admin",
  "administrator",
  "hunat",
  "moderator",
  "official",
  "root",
  "staff",
  "support",
  "system",
  "teacher",
];

/**
 * The Scunthorpe list.
 *
 * Every one of these contains a banned word and is perfectly ordinary English
 * or a perfectly ordinary name. They are cut out of the normalised text
 * *before* the banned words are looked for, so `Cassie`, `classmate` and
 * `sextant` survive while `a55hole` does not.
 */
const INNOCENT = [
  "analog",
  "analy", // analysis, analyse, analytic
  "assassin",
  "assemb",
  "assess",
  "asset",
  "assign",
  "assist",
  "associ",
  "assum",
  "assur",
  "bass",
  "brass",
  "cass", // Cassie, Cassidy, cassette
  "class",
  "compass",
  "cockpit",
  "cocktail",
  "essex",
  "glass",
  "grass",
  "hancock",
  "mass",
  "pass",
  "peacock",
  "scunthorpe",
  "sextan", // sextant
  "shiitake",
  "sussex",
  "titan",
  "title",
];

/**
 * What the name says once the tricks are undone: case folded, separators
 * dropped, and digits and symbols read back as the letters they stand in for.
 */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/[^a-z]/g, "");
}

/** A run of one letter read as one letter: what turns `fuuuck` back into a word. */
function collapse(text: string): string {
  return text.replace(/(.)(?:\1)+/g, "$1");
}

/** Cuts every innocent word out, so what is left is only what was added. */
function strip(text: string, safe: string[]): string {
  let out = text;
  for (const word of safe) {
    while (word && out.includes(word)) out = out.replace(word, "");
  }
  return out;
}

/**
 * True if the name reads as one of the words above once normalised.
 *
 * The collapsed form is checked too, but only against banned words of four
 * letters or more. Collapsing is what catches `fuuuck`; run it against the
 * three-letter words as well and `ass` matches the `as` inside Jason, which is
 * precisely the false positive this whole file exists to avoid.
 */
export function isUnacceptable(raw: string): boolean {
  if (RESERVED.includes(usernameKey(raw))) return true;

  const plain = strip(normalize(raw), INNOCENT.map(normalize));
  const squashed = strip(
    collapse(normalize(raw)),
    INNOCENT.map((w) => collapse(normalize(w))),
  );

  return BANNED.some((word) => {
    const folded = normalize(word);
    if (plain.includes(folded)) return true;
    return folded.length >= 4 && squashed.includes(collapse(folded));
  });
}

export type UsernameCheck =
  | { ok: true; username: string; key: string }
  | { ok: false; problem: string };

/**
 * The one place a username is judged. Everything that takes a name from a
 * person — sign-up, the profile gate, the friend search — runs it through here
 * first, so all of them refuse the same things for the same stated reason.
 */
export function checkUsername(raw: string): UsernameCheck {
  const username = raw.trim();

  if (!username) return { ok: false, problem: "Pick a username." };
  if (username.length < USERNAME_MIN) {
    return { ok: false, problem: `At least ${USERNAME_MIN} characters.` };
  }
  if (username.length > USERNAME_MAX) {
    return { ok: false, problem: `At most ${USERNAME_MAX} characters.` };
  }
  if (!SHAPE.test(username)) {
    return {
      ok: false,
      problem: "Letters, numbers and underscores only, starting with a letter.",
    };
  }
  if (isUnacceptable(username)) {
    return { ok: false, problem: "That username isn't available. Try another." };
  }

  return { ok: true, username, key: usernameKey(username) };
}
