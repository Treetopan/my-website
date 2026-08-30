import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Room } from "@/components/room";
import { parseSelection } from "@/lib/selection";

export const metadata: Metadata = { title: "Last One Standing · hunat" };

export default async function RoomPage({
  searchParams,
}: PageProps<"/play/room">) {
  const { s, join } = await searchParams;

  // A friend's invitation is a link, so it arrives as a query parameter rather
  // than as something typed into the code box.
  const joinCode = typeof join === "string" ? join.toUpperCase() : undefined;

  return (
    <RequireAuth>
      <Room subunitIds={parseSelection(s)} joinCode={joinCode} />
    </RequireAuth>
  );
}
