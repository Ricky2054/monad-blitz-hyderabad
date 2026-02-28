"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { MintSection } from "@/components/MintSection";
import { BountySection } from "@/components/BountySection";
import { ChallengeSection } from "@/components/ChallengeSection";
import { DuelArena } from "@/components/DuelArena";
import { StatsBar } from "@/components/StatsBar";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-monad-border backdrop-blur-sm sticky top-0 z-50 bg-monad-dark/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-monad-purple flex items-center justify-center text-white font-bold text-sm">
            BD
          </div>
          <h1 className="text-xl font-bold">
            <span className="text-monad-purple">Bounty</span> Duel Protocol
          </h1>
          <span className="text-xs px-2 py-0.5 bg-monad-purple/20 text-monad-purple rounded-full border border-monad-purple/30">
            Monad Testnet
          </span>
        </div>
        <ConnectButton />
      </header>

      {/* Hero */}
      <section className="text-center py-16 px-6">
        <h2 className="text-5xl font-black mb-4">
          On-Chain <span className="text-monad-purple">PvP Bounty</span> Settlement
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Mint a fighter NFT. Post bounties against any wallet. Settle disputes through 
          commit-reveal duels. Winner takes all. No off-chain referee. Powered by Monad&apos;s 
          10,000 TPS with 400ms blocks.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <div className="glow-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">400ms</div>
            <div className="text-xs text-gray-500">Block Time</div>
          </div>
          <div className="glow-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">800ms</div>
            <div className="text-xs text-gray-500">Finality</div>
          </div>
          <div className="glow-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">10K+</div>
            <div className="text-xs text-gray-500">TPS</div>
          </div>
          <div className="glow-card text-center !p-4">
            <div className="text-2xl font-bold text-green-400">100%</div>
            <div className="text-xs text-gray-500">On-Chain</div>
          </div>
        </div>
      </section>

      {isConnected ? (
        <div className="max-w-6xl mx-auto px-6 pb-20 space-y-8">
          <StatsBar />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <MintSection />
            <BountySection />
          </div>

          <ChallengeSection />
          <DuelArena />
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="glow-card inline-block animate-pulse-glow">
            <p className="text-gray-400 text-lg">
              Connect your wallet to enter the arena
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-monad-border py-6 text-center text-gray-600 text-sm">
        Autonomous Bounty Duel Protocol — Built on Monad for Monad Blitz Hyderabad
      </footer>
    </main>
  );
}
