import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Room } from "@/components/room";

export const metadata: Metadata = { title: "Last One Standing · Roundhouse" };

export default async function RoomPage({
  searchParams,
}: PageProps<"/play/room">) {
  const { s } = await searchParams;
  const subunitId = typeof s === "string" ? s : "";

  return (
    <RequireAuth>
      <Room subunitId={subunitId} />
    </RequireAuth>
  );
}
