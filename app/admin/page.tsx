import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { Admin } from "@/components/admin";

/**
 * The route exists for everybody; what is behind it does not. Firebase Auth
 * keeps its session in the browser, so a server component cannot know who is
 * asking — the page renders, and `<Admin>` shows an admin what it holds and
 * everybody else a dead end. Nothing is protected by the absence of this route:
 * the database rules are what refuse the reads.
 */
export const metadata: Metadata = { title: "Admin · hunat" };

export default function AdminPage() {
  return (
    <RequireAuth>
      <TopBar />
      <Admin />
    </RequireAuth>
  );
}
