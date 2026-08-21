"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Client-side gate. Firebase Auth holds its session in IndexedDB, so the
 * server has no view of it without the Admin SDK and a session cookie — this
 * is the honest boundary for an RTDB app. The database rules are what actually
 * protect data; this only decides what the UI shows.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Loading
        </p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
