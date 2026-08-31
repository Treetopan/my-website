"use client";

import { useAuth } from "@/lib/auth-context";
import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { Landing } from "@/components/landing";
import { Library } from "@/components/library";

/**
 * `/` is two screens: the library for somebody signed in, and the landing page
 * for somebody who is not.
 *
 * The signed-out half is answered here rather than by `RequireAuth`, because
 * this is the one route where having no account is not a wrong turn — every
 * other gated screen sends you to `/signup`, but the front door has something
 * to show you. While auth is still resolving the gate renders its own waiting
 * state, so there is one of those on the way in rather than two.
 */
export default function HomePage() {
  const { user, loading } = useAuth();

  if (!loading && !user) return <Landing />;

  return (
    <RequireAuth>
      <TopBar />
      <Library />
    </RequireAuth>
  );
}
