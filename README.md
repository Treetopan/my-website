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

### Multi-instance deploys — set a service account

Grading sessions record which questions were served and which positions have
already been graded. That has to be shared: whatever the client is given it can
replay, so "each question is graded exactly once" only holds if every instance
sees the same record. Sessions therefore live in the Realtime Database, written
with the Admin SDK under a `sessions` node the rules deny to everyone. The
Admin SDK bypasses rules, so the server can read what no client can.

Without a service account the app falls back to process memory and says so in
the server log. That is correct for `next dev` and for a single long-lived Node
server. On anything that runs several instances — Vercel's default — a session
minted on one instance is unknown to the next and grading fails with 404.

Firebase console → Project settings → **Service accounts** → Generate new
private key. Then either paste the JSON straight in, or base64 it first if your
host mangles multi-line values:

```bash
# .env.local  (never commit this)
FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","client_email":"...","private_key":"..."}'
# or
FIREBASE_SERVICE_ACCOUNT=eyJwcm9qZWN0X2lkIjoi...
```

The key is a full admin credential — it bypasses every rule in the database.
Keep it out of `NEXT_PUBLIC_*`, out of git, and out of the client bundle;
`lib/firebase-admin.ts` is marked `server-only` so importing it from a Client
Component is a build error rather than a leak.

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
roomAnswers/{roomId}/{i}/{uid}  { response, at }
sessions/{id}                 server-only — order, and which positions are graded
mints/{window}/{caller}       server-only — session rate limiting
```

Rooms carry the questions the server issued at kick-off. They used to carry only
a seed, with every client deriving the same order locally — that stopped working
once questions were generated per session, since the text then exists nowhere but
the response the host received. Answers still never travel with them.

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
another for speed, so answering efficiently is what wins races.

There is no clock. A question stays open until you answer it, and nothing is
ever submitted on your behalf. What the subunit's `seconds` sets is **par**:
answer instantly and the speed half of the distance is worth all of it, answer
at par or later and it is worth none, and in between it slides. Being slow
costs you the bonus; it never costs you the length you earned by being right,
and it can never end your question. The header counts up rather than down, and
the rail under it is the bonus draining, not time running out.

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

## The game spaces

Both games are played in a 3D space rather than against a readout of one.
`lib/scene3d.ts` is the whole renderer — about 300 lines, no WebGL, no
dependency. Polygons are built in world space, moved into the camera's frame,
clipped against the near plane, sorted back-to-front and filled on an ordinary
2D canvas. `components/scene-canvas.tsx` owns the canvas: device-pixel sizing,
resize, one frame loop, and the theme read back out of CSS so `globals.css`
stays the only place a colour is decided.

**Racer** is a circuit: kerbs, barriers, tyre stacks, grandstands with a crowd
in them, and two open-wheel cars that differ in silhouette as well as livery,
so they stay apart at the far end of the lap where colour has gone into the
haze. Distance along it is the same number the race is scored in, so a length
gained is a length of tarmac — the bar chart this replaced made you convert.
The camera rides behind whoever is *last*, pulling back rather than abandoning
them, up to the point where the leader would be too far off to read; the gap is
something you see instead of something you work out from two bar widths. The
finish sits at two lengths per question, the most anyone can score, so it never
moves mid-race.

The track bends. `bend(z)` is two sine waves that do not share a period, and
everything on the circuit — surface, kerbs, barriers, stands, both cars, the
camera — is placed through `on(z, u, y)`, which is "this far along, this far
across". Distance is still measured along z rather than along the arc: the
gradient peaks near 0.39, which makes the real racing line about 7% longer than
the number the race is scored in. That is invisible, and it is worth it for not
having to re-solve every position on the circuit against arc length.

**Last One Standing** is a table. Its three states are not a scale and a list
could only tell them apart with words, so the room says them with posture:
standing is still answering, sat down is out for the round but still in the
game, and an empty chair is removed for good. Your own seat is rotated to the
near side, so whose turn it is reads from where you are looking rather than
from matching a name against your own.

The same table carries all three screens of the game, because they are all the
same room:

- **The lobby** seats everyone who has joined and leaves the open places empty,
  so what "start now and bots take the empty seats" means is visible before you
  press it. Seats are not assigned until kick-off, so this is join order.
- **The elimination screen** puts the survivor in the accent and marks whoever
  the buttons are pointing at — hover or keyboard focus — in `--color-out`,
  with a ring on the floor. You remove a person from a table rather than a name
  from a list. The buttons stay the control: hit-testing a canvas would have
  made the choice mouse-only.
- **The turn screen** is the one in the aside while questions are being
  answered.

Two props carry the difference: `empty` for a seat nobody has taken yet, and
`markedUid` for the one about to be removed. A seat can also override the line
under its name with `status`, because the lobby and the elimination screen are
each describing something other than how the round is going.

**Colour.** Both scenes carry their own palettes, and neither takes them from
the design tokens. A token means something — the accent is a live answer,
`--color-out` is a wrong one — and a grandstand roof, a green baize or a
spectator's shirt means none of those things. Three things do reach into the
palette, all because they have to *signal*: your own car is the accent, so is
whoever is currently answering at the table, and a player being removed from
the game is `--color-out`, which is what that colour already means everywhere
else. Everyone else wears a jersey picked by seat, chosen well clear of the
teal so that turning accent-coloured still reads as a change.

**Cost.** The circuit builds about 560 polygons a frame and the table about
130, which is fewer than the flat-shaded road it replaced — kerbs and barriers
are single quads where the old marker posts were six-sided boxes, and a
spectator is one quad. Filling that many at full width measures ~1.8 ms, around
a ninth of a 60fps budget, and `requestAnimationFrame` stops entirely when the
tab is hidden. If you add to a scene, prefer a quad to a box: nobody sees the
back of a barrier.

Two notes for anyone extending this. The camera frame is left-handed — z runs
into the screen — so the right vector is `cross(UP, fwd)`; the right-handed
`cross(fwd, UP)` mirrors the scene, which costs nothing on a symmetrical road
and quietly reverses the direction of play around a table. And a large surface
has to be cut into segments: the painter's algorithm sorts by average depth, so
one long road quad averages to a single depth and paints over anything standing
on its far half.

Both scenes honour `prefers-reduced-motion` by snapping to their state instead
of easing towards it, and both carry the whole table or track in an
`aria-label`, so nothing is only available to someone who can see it.

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

Written banks: AP Biology (2 units), AP World History (2 units), AP Statistics
(1 unit) — 75 questions across 15 subunits.

Maths runs on **generators** instead. `lib/generators/` holds one file per
course: small programs that roll their own numbers, work out the answer, and
build distractors out of the mistakes the topic invites. Nothing is stored — an
instance id carries the generator and the seed, so grading re-derives the
question rather than looking it up. `lib/templates.ts` is the public half,
listing which subunits have generators and what each drills; the generators
themselves sit behind `server-only`, because a generator that computes the
answer solves every question it could ever produce.

Coverage is partial on purpose. A subunit earns a generator when rolling new
numbers makes a new question rather than the same question wearing a hat; proof
and construction subunits need written questions instead, and the library marks
them as having nothing to ask yet.

`npm run check:templates` sweeps millions of instances over fixed seeds,
checking shape, rendering and determinism. Run it after touching a generator —
the failures that matter are narrow parameter combinations invisible until the
one seed that triggers them comes up mid-game. `-- --samples` prints one
question per generator so the maths can be eyeballed.

## Question kinds

Not everything is multiple choice. Four options is a fine way to ask which
theorem applies and a poor way to ask where a point goes — the options either
give it away or turn a spatial question into a reading exercise. A question
declares its kind and the games render and grade whichever it is:

| Kind | Answered by | Graded |
| --- | --- | --- |
| `choice` | picking one of four | exactly |
| `fill` | typing it | exactly, but generously — `1/2`, `0.5` and `.50` all match |
| `slider` | dragging to a value | by how close |
| `point` | placing a point on a grid | by distance |
| `line` | dragging two handles | by how far the line sits from the intended one |

The last three pay **part marks**. Dropping a point one unit off is not the same
mistake as putting it in the wrong quadrant, and a scale that cannot tell them
apart throws away the most useful thing it knows. XP scales with the score, so a
near miss earns most of it and a wild one earns almost none.

`PASS` in `lib/questions.ts` is where "nearly" becomes "right" — it decides
streaks, the summary tally, and elimination in Last One Standing, because a
table cannot half-eliminate anybody. The scoring curve is public; only the target
it measures from stays server-side, in `lib/grading.server.ts`.

Bots answer every kind. A bot that misses a proximity question lands past the
point where the score reaches zero rather than "somewhere near" — aiming a miss
loosely sounds more lifelike and quietly makes every bot harder than its stated
accuracy.

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
- **Grading sessions fall back to process memory** when no service account is
  configured — see *Multi-instance deploys* above. Correct for `next dev` and a
  single long-lived Node server; on a multi-instance platform a session can land
  on an instance that never saw it and grading fails closed with 404. Setting
  `FIREBASE_SERVICE_ACCOUNT` fixes it.
- **Auth is client-side only.** Firebase keeps its session in IndexedDB, so
  `RequireAuth` decides what the UI shows, not what the server serves. The rules
  are the real boundary.
- **Rooms are deleted, not archived.** The host bins the room, its code and its
  answers three seconds after a game ends; an abandoned lobby is removed by
  `onDisconnect` when the host closes the tab. Every client snapshots the final
  state first, so the summary survives the deletion. Nothing about a finished
  room is worth keeping — the result already lives under `results/{uid}`.
- **Last One Standing pays no speed bonus** — survival is the mechanic, so every
  answer scores at the subunit's base rate. It is also the only game left with
  a clock: a turn-based table cannot let one player think for as long as they
  like while three others wait on them, so `seconds` is still a deadline there
  and a timed-out turn still counts as missed. In Racer the same number is par.
