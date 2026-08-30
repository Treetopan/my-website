import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Racer } from "@/components/racer";
import { parseSelection } from "@/lib/selection";

export const metadata: Metadata = { title: "Racer · hunat" };

export default async function RacerPage({
  searchParams,
}: PageProps<"/play/racer">) {
  const { s } = await searchParams;

  return (
    <RequireAuth>
      <Racer subunitIds={parseSelection(s)} />
    </RequireAuth>
  );
}
