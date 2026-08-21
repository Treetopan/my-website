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

## Known limitations

- **The host is trusted.** Room state is resolved on the host's client. RTDB
  rules stop a player overwriting their own answer, but a host who edits their
  client can decide the round. Moving resolution into a Cloud Function is the
  fix if this ever faces real students.
- **Auth is client-side only.** Firebase keeps its session in IndexedDB, so
  `RequireAuth` decides what the UI shows, not what the server serves. The rules
  are the real boundary.
- **Finished rooms and their codes are never cleaned up.** Nothing breaks — a
  used code reports "already started" — but the data accumulates. A scheduled
  Cloud Function deleting rooms older than a day is the fix.
- **Last One Standing pays no speed bonus** — survival is the mechanic, so every
  answer scores at the subunit's base rate.
