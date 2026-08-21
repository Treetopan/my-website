import type { Metadata } from "next";
import { Outfit, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

// Outfit carries every structural role — geometric, wide weight range,
// confident at display sizes without turning into a novelty face.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Plex Mono is reserved for things that count: clocks, scores, XP, streaks,
// question numbers. Nothing narrative is ever set in it.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roundhouse",
  description: "Learn your course by racing through it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
