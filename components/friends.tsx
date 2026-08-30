"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { GameId } from "@/lib/rtdb";
import {
  acceptFriend,
  declineFriend,
  dismissInvite,
  inviteFriend,
  inviteHref,
  removeFriend,
  requestFriend,
  watchFriendRequests,
  watchFriends,
  watchInvites,
  type Friend,
  type FriendRequest,
  type Invite,
  type Me,
} from "@/lib/social";
import { USERNAME_MAX } from "@/lib/username";

/**
 * Everything social, on one screen: who has invited you, who has asked to be
 * your friend, and who already is.
 *
 * The three sections are in that order because that is the order they need
 * answering in — an invitation is a room sitting open with people waiting in
 * it, a request costs somebody nothing to wait for, and the list itself is not
 * asking you anything at all.
 */
export function Friends() {
  const { user, username } = useAuth();
  const me: Me | null = user && username ? { uid: user.uid, username } : null;

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [wanted, setWanted] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const stop = [
      watchFriends(user.uid, setFriends),
      watchFriendRequests(user.uid, setRequests),
      watchInvites(user.uid, setInvites),
    ];
    return () => stop.forEach((off) => off());
  }, [user]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!me || busy) return;

    setBusy(true);
    setNote(null);
    const result = await requestFriend(me, wanted);
    setBusy(false);

    if (!result.ok) {
      setNote({ ok: false, text: result.problem });
      return;
    }
    setNote({ ok: true, text: `Asked ${wanted.trim()} to be a friend.` });
    setWanted("");
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-14 pb-24">
      <p className="eyebrow">You are</p>
      <h1 className="mt-2 mb-9 text-[32px] font-semibold tracking-[-0.035em]">
        {username ?? "—"}
      </h1>

      {/* ── Invitations ───────────────────────────────── */}
      {invites.length > 0 && (
        <Section title="Waiting for you" note="A friend has a room open.">
          <ul className="flex flex-col gap-2.5">
            {invites.map((invite) => (
              <li
                key={invite.uid}
                className="box box-on flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5"
              >
                <span className="flex-1 text-[14.5px]">
                  <span className="font-medium">{invite.username}</span>
                  <span className="text-muted"> invited you to a room</span>
                </span>
                <span className="font-mono text-[11px] tracking-[0.14em] text-faint">
                  {invite.code}
                </span>
                <Link
                  href={inviteHref(invite)}
                  className="rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
                >
                  Join
                </Link>
                <button
                  type="button"
                  onClick={() => user && dismissInvite(user.uid, invite.uid)}
                  className="text-[13px] text-faint transition-colors hover:text-ink"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Requests ──────────────────────────────────── */}
      {requests.length > 0 && (
        <Section title="Asked to be friends">
          <ul className="flex flex-col gap-2.5">
            {requests.map((request) => (
              <li
                key={request.uid}
                className="box flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5"
              >
                <span className="flex-1 text-[14.5px]">{request.username}</span>
                <button
                  type="button"
                  onClick={() =>
                    me &&
                    acceptFriend(me, {
                      uid: request.uid,
                      username: request.username,
                    })
                  }
                  className="rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => user && declineFriend(user.uid, request.uid)}
                  className="text-[13px] text-faint transition-colors hover:text-ink"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Add ───────────────────────────────────────── */}
      <Section
        title="Add a friend"
        note="By the username they picked. They have to accept before either of you shows up on the other's list."
      >
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
            {busy ? "Asking…" : "Add"}
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
      </Section>

      {/* ── The list ──────────────────────────────────── */}
      <Section
        title={friends.length ? `Friends · ${friends.length}` : "Friends"}
        note="Open a Last One Standing room and you can invite any of them straight into it."
      >
        {friends.length === 0 ? (
          <p className="text-[14px] text-faint">
            Nobody yet. Add someone by username above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {friends.map((friend) => (
              <li
                key={friend.uid}
                className="box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5"
              >
                <span className="flex-1 text-[14.5px]">{friend.username}</span>
                <button
                  type="button"
                  onClick={() => user && removeFriend(user.uid, friend.uid)}
                  className="text-[13px] text-faint transition-colors hover:text-out"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}

/**
 * The friends list as it appears inside a room, with the room attached to every
 * name: one press sends them the code they would otherwise have to be read out.
 *
 * Anyone at the table can invite, not just the host. The code is already shared
 * with everyone in the room, so restricting this to the host would guard
 * nothing and would mean a player whose friend is one seat away has to ask
 * somebody else to fetch them.
 */
export function InviteFriends({
  roomId,
  code,
  subunitIds,
  game,
}: {
  roomId: string;
  code: string;
  subunitIds: string[];
  /** Which game the room is running, so the invitation leads to it. */
  game: GameId;
}) {
  const { user, username } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    return watchFriends(user.uid, setFriends);
  }, [user]);

  if (!user || !username || friends.length === 0) return null;

  return (
    <div className="mt-8 border-t border-line-soft pt-6 text-left">
      <p className="eyebrow mb-3">Invite a friend</p>
      <ul className="flex flex-col gap-2">
        {friends.map((friend) => (
          <li
            key={friend.uid}
            className="flex items-center gap-4 text-[14px]"
          >
            <span className="flex-1">{friend.username}</span>
            <button
              type="button"
              disabled={sent[friend.uid]}
              onClick={async () => {
                await inviteFriend({ uid: user.uid, username }, friend.uid, {
                  roomId,
                  code,
                  subunitIds,
                  game,
                });
                setSent((prev) => ({ ...prev, [friend.uid]: true }));
              }}
              className="rounded-sm border border-line px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase transition-colors hover:border-accent hover:text-accent disabled:border-line-soft disabled:text-faint"
            >
              {sent[friend.uid] ? "Invited" : "Invite"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col border-t border-line-soft pt-8 pb-10">
      <h2 className="text-[22px] font-medium tracking-[-0.02em]">{title}</h2>
      {note && <p className="mt-2 text-[13.5px] text-faint">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
