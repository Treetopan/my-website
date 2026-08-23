# Roundhouse

A learning-games platform. Students drill down **subject → course → unit → subunit**,
then play that subunit as a game. Progress is personal — XP, levels and a daily
streak — rather than a public leaderboard.

## Running it

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Firebase setup — do this before anything touches the database

The web config lives in `lib/firebase.ts`. Web API keys are public by design;
what actually protects data is the rules file.

**1. Confirm the Realtime Database URL.** `getDatabase()` cannot derive a URL
from `projectId`, so `databaseURL` is set explicitly. The default assumes
`us-central1`:

```
https://game-learning-platform-default-rtdb.firebaseio.com
```

If the instance was created in another region the host differs — check
Firebase console → Realtime Database, and if it doesn't match, set:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://<project>-default-rtdb.<region>.firebasedatabase.app
```

Every other config value can be overridden the same way with
`NEXT_PUBLIC_FIREBASE_*` if you want a preview build on a second project.

**2. Enable Email/Password** under Authentication → Sign-in method.

**3. Publish the rules.** There are two rule files, because Firebase has two
databases and they do not share a rules language:

| File | Product | Language | Console location |
| --- | --- | --- | --- |
| `database.rules.json` | Realtime Database — everything this app uses | JSON | Build → **Realtime Database** → Rules |
| `firestore.rules` | Firestore — unused, closed off | `rules_version` / `match` | Build → **Firestore Database** → Rules |

If the rules editor you are looking at opens with `rules_version = '2';` you are
in Firestore. The Realtime Database editor expects JSON starting with
`{ "rules": {`. Pasting one into the other will not validate.

Until they are published, each database runs on whatever defaults the project
was created with — for a new project that usually means test mode, which is
open to the world until it expires.

*Fastest — paste them in:* open each Rules tab above, replace the contents with
the matching file, **Publish**.

*Repeatable — deploy from here:* needs the CLI, which is not installed yet.

```bash
npm install -g firebase-tools
firebase login          # opens a browser; run this yourself
firebase deploy --only database
```

`firebase.json` and `.firebaserc` are committed and already point at
`game-learning-platform`, so the deploy command needs no further setup.

## Data model (Realtime Database)

```
users/{uid}/progress          xp, streak, longestStreak, lastPlayedDate, played, won
results/{uid}/{id}            one record per finished session
roomCodes/{CODE}              { roomId, status } — the only globally readable node
rooms/{roomId}                seed, currentIndex, questionStartedAt, players
roomAnswers/{roomId}/{i}/{uid}  { choice, at }
```

Rooms carry a `seed`, not a question list — every client derives the same order
from `seededShuffle`, so the questions are never broadcast.

**Why answers sit outside the room.** Read permission in this database cascades
downward and cannot be revoked on a child. An `answers` node inside the room
would therefore be readable by everyone who can read the room — which is every
player in it — letting them see what their opponents picked before the reveal.
Moving answers to their own path means the host can read the set to resolve a
question, each player can read their own back, and nobody can read anyone
else's.

**Why `roomCodes` exists.** Rooms are readable only by the people in them, so a
joiner cannot look one up directly. The code index holds no game data — just a
pointer and a status — and joining works by writing your own seat first, which
is what earns you read access to the room.

Answers are write-once at the rules level (`!data.exists()`), so a player cannot
change an answer after the reveal.

## The games

**Racer** — you against a bot. A correct answer moves you one length plus up to
another for speed, so answering fast is what wins races.

**Last One Standing** — played around the table, one player at a time.

- On your turn you answer. Miss it and you *sit down* for the rest of the round,
  but you are still in the game.
- When only one player is left answering, they have won the round and choose
  one player to **remove from the game** for good.
- Everyone else plays on. New round, everyone still in it answers again.
- Repeat until one player remains.

Two flags per player carry this and they are not the same thing: `alive` is
still in the game, `inRound` is still answering this round. The rules live in
`lib/table.ts` rather than the component, and are tested.

Neither game shows how many questions are left — knowing the end is coming
changes how people play. Last One Standing wraps the question bank when it runs
out, since a turn-based round burns a question per turn.

## After a game

`lib/review.ts` turns a run into something to act on: accuracy, XP, which
concepts were missed (worst first), which were clean sweeps, and the full text
of every question to go back to with the right answer beside what you picked.
Questions carry a `topic` so the summary can name the idea, not just the score.
Timed-out turns count as missed rather than vanishing. Tested.

## Content

`lib/curriculum.ts` holds the tree. Difficulty is a property of a **subunit**,
never a filter the student picks — it describes how hard the material is to
answer *quickly*, and it sets the clock (15/22/30s) and the XP (10/20/35).

Currently stocked: AP Biology (2 units), AP World History (2 units), AP
Statistics (1 unit) — 75 questions across 15 subunits. Courses with no units
show as unavailable in the library rather than being hidden. Adding real
curriculum is a change to this one file.

Each subunit holds 5 questions, which makes for a short race. Ten to fifteen
per subunit would suit the Racer better.

## Answers never reach the browser

Question text and options are public — a student is meant to read them — but
the correct option is not. `lib/answers.server.ts` carries `import
"server-only"`, so importing it from a Client Component is a **build error**,
not a code-review question.

Grading goes through two routes:

- `POST /api/session` — `{subunitId, length?}` opens a session and returns the
  question **order**. The server owns the order so grading can be keyed to a
  position rather than a question id: a turn-based game that runs past the end
  of the bank meets the same question at a new position, which is a new
  grading rather than a replay of an old one.
- `POST /api/answer` — `{sessionId, position, choice}` grades one position,
  **once**, and returns the verdict with the correct option. A second attempt
  at the same position is a 409.

`choice: null` (the clock ran out) still consumes that position’s grading —
otherwise "send null and read the answer back" would be a free oracle, which
is the entire thing this design exists to prevent. Bot turns are rolled
server-side (`bot: <accuracy>`) because picking a plausible *wrong* option
requires knowing the right one.

**Topics must not name the answer.** A question’s `topic` ships to the client.
Twenty-one of them originally repeated the correct option verbatim, which
handed the answer over. Keep topics at concept level — "Protein trafficking",
not "Golgi apparatus". There is a check for this in the notes below.

## Known limitations

- **The host still decides the round.** Grading is now the server's job, so no
  client holds the answer key — but the host's client is still what writes who
  is out and who won. A modified host client can win. Closing that means moving
  room state transitions server-side too (a Route Handler with the Admin SDK,
  or a Cloud Function on the Blaze plan).
- **Grading sessions live in process memory.** Correct for `next dev` and a
  single long-lived Node server. On a multi-instance platform (Vercel's
  default) a session can land on an instance that never saw it and grading
  fails closed with 404. Move `lib/session-store.ts` behind Redis or an
  Admin-SDK-written `sessions/{uid}` node before deploying that way.
- **Auth is client-side only.** Firebase keeps its session in IndexedDB, so
  `RequireAuth` decides what the UI shows, not what the server serves. The rules
  are the real boundary.
- **Rooms are deleted, not archived.** The host bins the room, its code and its
  answers three seconds after a game ends; an abandoned lobby is removed by
  `onDisconnect` when the host closes the tab. Every client snapshots the final
  state first, so the summary survives the deletion. Nothing about a finished
  room is worth keeping — the result already lives under `results/{uid}`.
- **Last One Standing pays no speed bonus** — survival is the mechanic, so every
  answer scores at the subunit's base rate.
