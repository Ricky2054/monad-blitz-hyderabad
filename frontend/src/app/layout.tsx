import type { Metadata } from "next";
import { Providers } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bounty Duel Protocol | Monad",
  description:
    "Autonomous on-chain PvP bounty settlement layer on Monad — mint characters, post bounties, duel with commit-reveal, winner takes all.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
