import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Racer } from "@/components/racer";

export const metadata: Metadata = { title: "Racer · hunat" };

export default async function RacerPage({
  searchParams,
}: PageProps<"/play/racer">) {
  const { s } = await searchParams;
  const subunitId = typeof s === "string" ? s : "";

  return (
    <RequireAuth>
      <Racer subunitId={subunitId} />
    </RequireAuth>
  );
}
