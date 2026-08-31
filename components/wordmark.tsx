import Link from "next/link";

/**
 * The name, top left, on every screen.
 *
 * It is one component rather than a copy per header because it appears in six
 * places — the library bar, both game headers, the lobby, the auth pages and the
 * landing page — and a wordmark that differs between screens reads as two
 * different sites.
 * Always the first thing in its header, so it lands in the top-left corner
 * wherever it is used, and always a link home.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="hunat — home"
      className={`flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] ${className}`}
    >
      <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
      hunat
    </Link>
  );
}
