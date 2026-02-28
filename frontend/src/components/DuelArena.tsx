"use client";

import { useState } from "react";
import {
  useRevealMove,
  useResolveDuel,
  useDuel,
  MOVES,
  DUEL_STATES,
  MoveType,
} from "@/hooks/useContract";
import { formatEther } from "viem";

export function DuelArena() {
  // ─── Reveal ───
  const [revealDuelId, setRevealDuelId] = useState("");
  const [revealMove, setRevealMove] = useState<MoveType | null>(null);
  const [revealNonce, setRevealNonce] = useState("");
  const reveal = useRevealMove();

  // ─── Resolve ───
  const [resolveDuelId, setResolveDuelId] = useState("");
  const resolveHook = useResolveDuel();

  // ─── View Duel ───
  const [viewDuelId, setViewDuelId] = useState("");
  const { data: duel } = useDuel(BigInt(viewDuelId || "0"));

  const handleReveal = () => {
    if (!revealDuelId || revealMove === null || !revealNonce) return;
    reveal.reveal(BigInt(revealDuelId), revealMove, revealNonce as `0x${string}`);
  };

  const handleResolve = () => {
    if (!resolveDuelId) return;
    resolveHook.resolve(BigInt(resolveDuelId));
  };

  return (
    <div className="space-y-8">
      {/* Duel Viewer */}
      <div className="glow-card">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🏟️</span> Duel Arena
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="number"
            min="1"
            placeholder="Duel ID"
            value={viewDuelId}
            onChange={(e) => setViewDuelId(e.target.value)}
            className="flex-1 bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
          />
        </div>

        {duel && Number(duel.state) > 0 && (
          <div className="bg-monad-dark rounded-xl p-6">
            {/* State Badge */}
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  Number(duel.state) === 3
                    ? "bg-green-900/50 text-green-400"
                    : Number(duel.state) === 4
                    ? "bg-red-900/50 text-red-400"
                    : Number(duel.state) === 2
                    ? "bg-yellow-900/50 text-yellow-400"
                    : "bg-blue-900/50 text-blue-400"
                }`}
              >
                {DUEL_STATES[Number(duel.state)]}
              </span>
              <span className="text-gray-500 text-sm">Bounty #{Number(duel.bountyId)}</span>
            </div>

            {/* VS Layout */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Challenger */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Challenger</div>
                <div className="text-monad-purple font-mono text-sm">
                  {duel.challenger.slice(0, 6)}...{duel.challenger.slice(-4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Token #{Number(duel.challengerTokenId)}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {formatEther(duel.challengerStake)} MON
                </div>
                {duel.challengerRevealed && (
                  <span className="text-green-400 text-xs">
                    {MOVES[Number(duel.challengerMove)]}
                  </span>
                )}
                {!duel.challengerRevealed && Number(duel.state) >= 2 && (
                  <span className="text-yellow-400 text-xs">Hidden</span>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-4xl font-black text-monad-purple">VS</div>
                {Number(duel.state) === 3 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500">Winner</div>
                    <div className="text-green-400 font-mono text-xs">
                      {duel.winner.slice(0, 6)}...{duel.winner.slice(-4)}
                    </div>
                  </div>
                )}
              </div>

              {/* Target */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Target</div>
                <div className="text-red-400 font-mono text-sm">
                  {duel.target.slice(0, 6)}...{duel.target.slice(-4)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Token #{Number(duel.targetTokenId)}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {formatEther(duel.targetStake)} MON
                </div>
                {duel.targetRevealed && (
                  <span className="text-green-400 text-xs">
                    {MOVES[Number(duel.targetMove)]}
                  </span>
                )}
                {!duel.targetRevealed && Number(duel.state) >= 2 && (
                  <span className="text-yellow-400 text-xs">Hidden</span>
                )}
              </div>
            </div>

            {/* Deadlines */}
            <div className="flex justify-between mt-4 text-xs text-gray-600">
              <span>
                Commit deadline:{" "}
                {Number(duel.commitDeadline)
                  ? new Date(Number(duel.commitDeadline) * 1000).toLocaleTimeString()
                  : "-"}
              </span>
              <span>
                Reveal deadline:{" "}
                {Number(duel.revealDeadline)
                  ? new Date(Number(duel.revealDeadline) * 1000).toLocaleTimeString()
                  : "-"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Reveal + Resolve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reveal Move */}
        <div className="glow-card">
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <span className="text-2xl">👁️</span> Reveal Move
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Submit your move + nonce to prove your commitment.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Duel ID</label>
              <input
                type="number"
                min="1"
                value={revealDuelId}
                onChange={(e) => setRevealDuelId(e.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">Your Move</label>
              <div className="flex gap-2">
                {MOVES.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => setRevealMove(i as MoveType)}
                    className={`move-btn flex-1 text-sm ${
                      m === "STRIKE"
                        ? "move-strike"
                        : m === "GUARD"
                        ? "move-guard"
                        : "move-heal"
                    } ${revealMove === i ? "ring-2 ring-white ring-offset-2 ring-offset-monad-dark" : "opacity-60"}`}
                  >
                    {m === "STRIKE" ? "⚔️" : m === "GUARD" ? "🛡️" : "💚"} {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Your Nonce (saved from commit step)</label>
              <input
                type="text"
                placeholder="0x..."
                value={revealNonce}
                onChange={(e) => setRevealNonce(e.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={handleReveal}
              disabled={reveal.isPending || reveal.isConfirming || revealMove === null}
              className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
            >
              {reveal.isPending || reveal.isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Revealing...
                </span>
              ) : (
                "Reveal Move"
              )}
            </button>

            {reveal.isSuccess && (
              <p className="text-green-400 text-sm">✅ Move revealed on-chain!</p>
            )}
          </div>
        </div>

        {/* Resolve Duel */}
        <div className="glow-card">
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Resolve Duel
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Anyone can call this. The contract determines winner on-chain and transfers 
            bounty + stakes automatically.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Duel ID</label>
              <input
                type="number"
                min="1"
                value={resolveDuelId}
                onChange={(e) => setResolveDuelId(e.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>

            <button
              onClick={handleResolve}
              disabled={resolveHook.isPending || resolveHook.isConfirming}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-monad-purple to-pink-600 hover:opacity-90 text-white font-bold text-lg transition-all disabled:opacity-50"
            >
              {resolveHook.isPending || resolveHook.isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Resolving...
                </span>
              ) : (
                "⚡ Resolve Duel"
              )}
            </button>

            {resolveHook.isSuccess && (
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm text-green-400">
                ✅ Duel resolved! Winner has received bounty + stakes.{" "}
                <a
                  href={`https://testnet.monadexplorer.com/tx/${resolveHook.hash}`}
                  target="_blank"
                  className="underline text-monad-purple"
                >
                  View tx
                </a>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="mt-6 pt-4 border-t border-monad-border">
            <h4 className="text-sm font-bold text-gray-400 mb-2">Combat Logic (on-chain)</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>⚔️ <b className="text-red-400">STRIKE</b> beats 💚 HEAL (bonus damage)</p>
              <p>🛡️ <b className="text-blue-400">GUARD</b> beats ⚔️ STRIKE (absorbs)</p>
              <p>💚 <b className="text-green-400">HEAL</b> beats 🛡️ GUARD (free recovery)</p>
              <p className="text-gray-500 mt-2">
                Damage depends on NFT stats (ATK/DEF). Winner = higher HP after combat.
                Ties broken by deterministic hash.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
