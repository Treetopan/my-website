"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, serverTimestamp, update } from "firebase/database";
import { auth, realtimeDb } from "@/lib/firebase";
import { claimUsername, watchUsername, type ClaimResult } from "@/lib/social";

type AuthState = {
  user: User | null;
  /** True until the first onAuthStateChanged fires — not the same as signed out. */
  loading: boolean;
  /**
   * The name this player is known by, or null if they have not claimed one.
   * Watched rather than read once, so claiming a name updates every screen
   * showing it without a reload.
   */
  username: string | null;
  /** True until the username has been looked up. Not the same as having none. */
  usernameLoading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<ClaimResult>;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Sends a reset link, and says nothing about whether it went anywhere.
   *
   * An address with no account is not an error here: reporting one would undo
   * the care taken over the sign-in message, since "no account" is exactly
   * what that message refuses to say. The caller shows the same line whatever
   * happened, so a reset is not a second way to test an address.
   */
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Claims a username for the signed-in player, or says why it could not be. */
  setUsername: (username: string) => Promise<ClaimResult>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * What went wrong, in a sentence, and what kind of wrong it was.
 *
 * The kind exists because one failure needs more than a sentence. Sign-in is
 * the only error a player can be genuinely stuck on, and it is also the one
 * whose message is not allowed to be specific: saying whether the email or the
 * password was the wrong half would let anybody test an address, one guess at
 * a time, and learn whether it is registered. So the message stays ambiguous
 * and the screen offers the two ways out instead — which means the screen has
 * to know which error it is looking at.
 *
 * Anything without a line of its own falls through to the raw message rather
 * than a shrug.
 */
export type AuthProblem = {
  message: string;
  /** `credentials` is the sign-in failure the form offers a way past. */
  kind: "credentials" | "other";
};

export function authProblem(error: unknown): AuthProblem {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  const say = (message: string): AuthProblem => ({ message, kind: "other" });

  switch (code) {
    case "auth/email-already-in-use":
      return say("That email already has an account. Sign in instead.");
    case "auth/invalid-email":
      return say("That email address isn't valid.");
    case "auth/weak-password":
      return say("Passwords need at least six characters.");

    // Three codes, one sentence, deliberately. Firebase collapses the last two
    // into `invalid-credential` while Email Enumeration Protection is on — it
    // is on for this project — and they stay listed because a browser running
    // an older build can still be handed them. All three have to read the same
    // either way: the difference between them is the leak.
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return {
        message:
          "We couldn't sign you in. Check your email and password — or create an account.",
        kind: "credentials",
      };

    case "auth/too-many-requests":
      return say("Too many attempts. Wait a minute and try again.");
    case "auth/network-request-failed":
      return say("Can't reach Firebase. Check your connection.");
    default:
      return say(
        error instanceof Error
          ? error.message
          : "Something went wrong. Try again.",
      );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Stamped with the uid it belongs to rather than cleared when the user
  // changes: an effect that clears state on the way out sets state during
  // render, and a name left over from the previous account would otherwise be
  // read as the new one's for a frame.
  const [profile, setProfile] = useState<{
    uid: string;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  // The username lives in the database rather than on the auth profile,
  // because it is the thing another player looks you up by and a profile field
  // nobody else can read is no use for that. The profile carries a copy, which
  // is what rooms already show.
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return watchUsername(uid, (name) => setProfile({ uid, username: name }));
  }, [user]);

  const mine = user && profile?.uid === user.uid ? profile : null;
  const username = mine?.username ?? null;
  const usernameLoading = user ? mine === null : false;

  const value = useMemo<AuthState>(() => {
    /**
     * Claiming is two writes: the index, which is what makes the name unique,
     * and the auth profile, which is the copy a room reads. The profile is
     * written second and only on success, so a name that lost the race never
     * ends up displayed as though it had been won.
     */
    async function claim(uid: string, raw: string): Promise<ClaimResult> {
      const result = await claimUsername(uid, raw);
      if (result.ok && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: result.username });
      }
      return result;
    }

    return {
      user,
      loading,
      username,
      usernameLoading,

      async signUp(email, password, wanted) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Mirror the account into RTDB so rooms and friends can read it
        // without a second auth lookup per player. The email is deliberately
        // not mirrored: that node is readable by every signed-in player, so a
        // copy of it here would be an address book the whole app can read.
        // Firebase Auth holds the address; the admin route joins it back on.
        await update(ref(realtimeDb, `users/${cred.user.uid}`), {
          createdAt: serverTimestamp(),
        });

        // A username that is taken by the time the account exists is not a
        // failed sign-up — the account is real and signed in. The gate asks
        // for another name rather than throwing the registration away.
        return claim(cred.user.uid, wanted);
      },

      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },

      async resetPassword(email) {
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (err) {
          // Swallowed only for the one code that would give the game away.
          // A malformed address or a rate limit is still worth reporting,
          // because neither says anything about who has an account.
          const code =
            typeof err === "object" && err && "code" in err
              ? String((err as { code: unknown }).code)
              : "";
          if (code !== "auth/user-not-found") throw err;
        }
      },

      async signOut() {
        await fbSignOut(auth);
      },

      async setUsername(raw) {
        if (!user) return { ok: false, problem: "You are not signed in." };
        return claim(user.uid, raw);
      },
    };
  }, [user, loading, username, usernameLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
