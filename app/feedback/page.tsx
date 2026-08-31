import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { FeedbackForm } from "@/components/feedback-form";

/**
 * Behind the sign-in gate, because a note has to come from somebody: the rules
 * refuse a write that is not stamped with the uid making it, which is what
 * stops the one node any player may write to becoming a place to dump things.
 */
export const metadata: Metadata = { title: "Feedback · hunat" };

export default function FeedbackPage() {
  return (
    <RequireAuth>
      <TopBar />
      <FeedbackForm />
    </RequireAuth>
  );
}
