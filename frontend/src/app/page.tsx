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
    <main className="min-h-screen relative">
      <div className="floating-orb w-72 h-72 bg-monad-purple/30 top-16 -left-20" />
      <div className="floating-orb w-64 h-64 bg-cyan-400/20 top-52 right-8" style={{ animationDelay: "-2.3s" }} />
      <div className="floating-orb w-96 h-96 bg-fuchsia-500/15 bottom-12 left-1/2 -translate-x-1/2" style={{ animationDelay: "-4.8s" }} />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-monad-border backdrop-blur-md sticky top-0 z-50 bg-monad-dark/65">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-monad-purple to-violet-400 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_20px_rgba(131,110,249,0.55)]">
            BD
          </div>
          <h1 className="text-xl font-bold">
            <span className="hero-accent">Bounty</span> Duel Protocol
          </h1>
          <span className="text-xs px-2 py-0.5 bg-monad-purple/20 text-monad-purple rounded-full border border-monad-purple/30 shadow-[0_0_18px_rgba(131,110,249,0.35)]">
            Monad Testnet
          </span>
        </div>
        <ConnectButton />
      </header>

      {/* Hero */}
      <section className="text-center py-20 px-6 relative overflow-hidden">
        <h2 className="text-5xl md:text-6xl font-black mb-5 leading-tight hero-title">
          On-Chain PvP Bounty Settlement
        </h2>
        <p className="text-gray-300/90 max-w-3xl mx-auto text-lg md:text-xl">
          Mint a fighter NFT. Post bounties against any wallet. Settle disputes through 
          commit-reveal duels. Winner takes all. No off-chain referee. Powered by Monad&apos;s 
          10,000 TPS with 400ms blocks.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-10">
          <div className="glow-card metric-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">400ms</div>
            <div className="text-xs text-gray-500">Block Time</div>
          </div>
          <div className="glow-card metric-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">800ms</div>
            <div className="text-xs text-gray-500">Finality</div>
          </div>
          <div className="glow-card metric-card text-center !p-4">
            <div className="text-2xl font-bold text-monad-purple">10K+</div>
            <div className="text-xs text-gray-500">TPS</div>
          </div>
          <div className="glow-card metric-card text-center !p-4">
            <div className="text-2xl font-bold text-green-400">100%</div>
            <div className="text-xs text-gray-500">On-Chain</div>
          </div>
        </div>
      </section>

      {isConnected ? (
        <div className="max-w-6xl mx-auto px-6 pb-24 space-y-10">
          <StatsBar />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 section-shell p-1 rounded-2xl">
            <MintSection />
            <BountySection />
          </div>

          <div className="section-shell p-1 rounded-2xl">
            <ChallengeSection />
          </div>

          <div className="section-shell p-1 rounded-2xl">
            <DuelArena />
          </div>
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
      <footer className="border-t border-monad-border/70 py-6 text-center text-gray-500 text-sm backdrop-blur-md bg-black/15">
        Autonomous Bounty Duel Protocol — Built on Monad for Monad Blitz Hyderabad
      </footer>
    </main>
  );
}
