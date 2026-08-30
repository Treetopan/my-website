import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Duel } from "@/components/duel";
import { parseSelection } from "@/lib/selection";

export const metadata: Metadata = { title: "Mirror Duel · hunat" };

export default async function DuelPage({
  searchParams,
}: PageProps<"/play/duel">) {
  const { s, join } = await searchParams;

  // A friend's invitation is a link, so it arrives as a query parameter rather
  // than as something typed into the code box.
  const joinCode = typeof join === "string" ? join.toUpperCase() : undefined;

  return (
    <RequireAuth>
      <Duel subunitIds={parseSelection(s)} joinCode={joinCode} />
    </RequireAuth>
  );
}
