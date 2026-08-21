import { TopBar } from "@/components/top-bar";
import { RequireAuth } from "@/components/require-auth";
import { Library } from "@/components/library";

export default function LibraryPage() {
  return (
    <RequireAuth>
      <TopBar />
      <Library />
    </RequireAuth>
  );
}
