import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { Profile } from "@/components/profile";

export const metadata: Metadata = { title: "Profile · hunat" };

export default function ProfilePage() {
  return (
    <RequireAuth>
      <TopBar />
      <Profile />
    </RequireAuth>
  );
}
