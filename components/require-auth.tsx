"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { UsernameGate } from "@/components/username-gate";

/**
 * Client-side gate. Firebase Auth holds its session in IndexedDB, so the
 * server has no view of it without the Admin SDK and a session cookie — this
 * is the honest boundary for an RTDB app. The database rules are what actually
 * protect data; this only decides what the UI shows.
 *
 * It gates on two things, not one: signed in, and named. A player with no
 * username cannot be added as a friend, cannot be invited, and sits at the
 * table as a blank — so the name is asked for here, once, rather than checked
 * for again on every screen that needs it.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, username, usernameLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || (user && usernameLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Loading
        </p>
      </div>
    );
  }

  if (!user) return null;
  if (!username) return <UsernameGate />;

  return <>{children}</>;
}
