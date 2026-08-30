import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Practice } from "@/components/practice";
import { parseSelection } from "@/lib/selection";

export const metadata: Metadata = { title: "Practice · hunat" };

export default async function PracticePage({
  searchParams,
}: PageProps<"/play/practice">) {
  const { s } = await searchParams;

  return (
    <RequireAuth>
      <Practice subunitIds={parseSelection(s)} />
    </RequireAuth>
  );
}
