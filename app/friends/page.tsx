import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { Friends } from "@/components/friends";

export const metadata: Metadata = { title: "Friends · hunat" };

export default function FriendsPage() {
  return (
    <RequireAuth>
      <TopBar />
      <Friends />
    </RequireAuth>
  );
}
