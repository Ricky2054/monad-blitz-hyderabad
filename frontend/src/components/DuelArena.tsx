"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import {
  DUEL_STATES,
  MOVES,
  MoveType,
  getCommitment,
  useDuel,
  useResolveDuel,
  useRevealMove,
} from "@/hooks/useContract";
import { formatEther } from "viem";

type FighterArchetype = {
  label: string;
  emoji: string;
  aura: string;
};

const FIGHTER_ARCHETYPES: FighterArchetype[] = [
  { label: "Shadow Ronin", emoji: "🥷", aura: "from-violet-500/35 to-fuchsia-500/15" },
  { label: "Iron Vanguard", emoji: "🛡️", aura: "from-cyan-500/35 to-blue-500/15" },
  { label: "Wild Berserker", emoji: "⚔️", aura: "from-red-500/35 to-orange-500/15" },
  { label: "Arcane Monk", emoji: "🧙", aura: "from-purple-500/35 to-indigo-500/15" },
  { label: "Forest Warden", emoji: "🦊", aura: "from-emerald-500/35 to-teal-500/15" },
];

function pickArchetype(address?: string): FighterArchetype {
  if (!address) return FIGHTER_ARCHETYPES[0];
  const seed = address
    .toLowerCase()
    .replace("0x", "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FIGHTER_ARCHETYPES[seed % FIGHTER_ARCHETYPES.length];
}

function getMoveEmoji(move: number) {
  if (move === 0) return "⚔️";
  if (move === 1) return "🛡️";
  return "💚";
}

export function DuelArena() {
  const { address } = useAccount();

  const [revealDuelId, setRevealDuelId] = useState("");
  const [revealMove, setRevealMove] = useState<MoveType | null>(null);
  const [revealNonce, setRevealNonce] = useState("");
  const [revealError, setRevealError] = useState("");
  const [autoLoaded, setAutoLoaded] = useState(false);

  const [resolveDuelId, setResolveDuelId] = useState("");
  const [resolveError, setResolveError] = useState("");

  const [viewDuelId, setViewDuelId] = useState("");

  const reveal = useRevealMove();
  const resolveHook = useResolveDuel();

  const { data: revealDuel } = useDuel(BigInt(revealDuelId || "0"));
  const { data: resolveDuel } = useDuel(BigInt(resolveDuelId || "0"));
  const { data: duel } = useDuel(BigInt(viewDuelId || "0"));

  useEffect(() => {
    if (!revealDuelId || !address) {
      setAutoLoaded(false);
      return;
    }
    const saved = getCommitment(revealDuelId, address);
    if (saved) {
      setRevealMove(saved.move);
      setRevealNonce(saved.nonce);
      setAutoLoaded(true);
    } else {
      setAutoLoaded(false);
    }
  }, [revealDuelId, address]);

  const parseWriteError = (error?: Error | null) => {
    if (!error) return "";
    const message = error.message || "";
    const executionReverted = message.match(/execution reverted(?::\s*)?([^\n]*)/i);
    if (executionReverted?.[1]) return executionReverted[1].trim();
    const details = message.match(/Details:\s*([^\n]+)/i);
    if (details?.[1]) return details[1].trim();
    return message.split("\n")[0] || "Transaction reverted.";
  };

  const handleReveal = () => {
    setRevealError("");

    if (!revealDuelId || revealMove === null || !revealNonce) {
      setRevealError("Fill all fields: Duel ID, Move, and Nonce.");
      return;
    }
    if (!address) {
      setRevealError("Connect your wallet first.");
      return;
    }

    if (revealDuel) {
      const state = Number(revealDuel.state);
      if (state === 0) {
        setRevealError(`Duel #${revealDuelId} doesn't exist.`);
        return;
      }
      if (state !== 2) {
        setRevealError(`Duel #${revealDuelId} is in ${DUEL_STATES[state]} state — must be ACTIVE to reveal.`);
        return;
      }

      const isChallenger = revealDuel.challenger.toLowerCase() === address.toLowerCase();
      const isTarget = revealDuel.target.toLowerCase() === address.toLowerCase();
      if (!isChallenger && !isTarget) {
        setRevealError("You are not a participant in this duel. Switch wallet.");
        return;
      }
      if (isChallenger && revealDuel.challengerRevealed) {
        setRevealError("You (challenger) already revealed your move!");
        return;
      }
      if (isTarget && revealDuel.targetRevealed) {
        setRevealError("You (target) already revealed your move!");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (Number(revealDuel.revealDeadline) > 0 && now > Number(revealDuel.revealDeadline)) {
        setRevealError("Reveal deadline has passed!");
        return;
      }
    }

    reveal.reveal(BigInt(revealDuelId), revealMove, revealNonce as `0x${string}`);
  };

  const handleResolve = () => {
    setResolveError("");
    if (!resolveDuelId) {
      setResolveError("Enter a Duel ID.");
      return;
    }

    if (resolveDuel) {
      const state = Number(resolveDuel.state);
      if (state === 0) {
        setResolveError(`Duel #${resolveDuelId} doesn't exist.`);
        return;
      }
      if (state === 3) {
        setResolveError("This duel is already RESOLVED.");
        return;
      }
      if (state === 4) {
        setResolveError("This duel was CANCELED.");
        return;
      }
      if (state === 2) {
        const bothRevealed = resolveDuel.challengerRevealed && resolveDuel.targetRevealed;
        const now = Math.floor(Date.now() / 1000);
        const deadlinePassed = Number(resolveDuel.revealDeadline) > 0 && now > Number(resolveDuel.revealDeadline);
        if (!bothRevealed && !deadlinePassed) {
          const remaining = Number(resolveDuel.revealDeadline) - now;
          const mins = Math.ceil(remaining / 60);
          setResolveError(
            `Both players must reveal first, or wait for reveal deadline (${mins} min remaining). ` +
              `Challenger: ${resolveDuel.challengerRevealed ? "revealed" : "pending"} | Target: ${resolveDuel.targetRevealed ? "revealed" : "pending"}`
          );
          return;
        }
      }
      if (state === 1) {
        const now = Math.floor(Date.now() / 1000);
        if (now <= Number(resolveDuel.commitDeadline)) {
          const remaining = Number(resolveDuel.commitDeadline) - now;
          const mins = Math.ceil(remaining / 60);
          setResolveError(`Duel still in CREATED state. Wait ${mins} min for commit deadline, or target needs to accept.`);
          return;
        }
      }
    }

    resolveHook.resolve(BigInt(resolveDuelId));
  };

  const arena = useMemo(() => {
    if (!duel || Number(duel.state) === 0) return null;

    const challengerType = pickArchetype(duel.challenger);
    const targetType = pickArchetype(duel.target);
    const isResolved = Number(duel.state) === 3;

    const challengerStateClass =
      isResolved && duel.winner.toLowerCase() === duel.challenger.toLowerCase()
        ? "fighter-win"
        : duel.challengerRevealed
        ? Number(duel.challengerMove) === 0
          ? "fighter-strike"
          : Number(duel.challengerMove) === 1
          ? "fighter-guard"
          : "fighter-heal"
        : "fighter-idle";

    const targetStateClass =
      isResolved && duel.winner.toLowerCase() === duel.target.toLowerCase()
        ? "fighter-win"
        : duel.targetRevealed
        ? Number(duel.targetMove) === 0
          ? "fighter-strike"
          : Number(duel.targetMove) === 1
          ? "fighter-guard"
          : "fighter-heal"
        : "fighter-idle";

    const clash = duel.challengerRevealed && duel.targetRevealed && Number(duel.state) >= 2;

    return (
      <div className="arena-shell rounded-2xl p-5 border border-monad-border bg-monad-dark/70 space-y-4">
        <div className="flex items-center justify-between mb-1">
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
          <span className="text-xs text-gray-400">Bounty #{Number(duel.bountyId)}</span>
        </div>

        <div className="fighter-stage grid grid-cols-3 gap-4 items-center">
          <div className="sticker-fighter text-center">
            <div className={`fighter-avatar ${challengerStateClass}`}>
              <div className={`fighter-aura bg-gradient-to-br ${challengerType.aura}`} />
              <span className="fighter-emoji">{challengerType.emoji}</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">{challengerType.label}</div>
            <div className="text-monad-purple font-mono text-xs">{duel.challenger.slice(0, 6)}...{duel.challenger.slice(-4)}</div>
            <div className="text-xs text-gray-500">Token #{Number(duel.challengerTokenId)} • {formatEther(duel.challengerStake)} MON</div>
            <div className="mt-1 text-xs font-semibold">
              {duel.challengerRevealed ? (
                <span className="text-green-400">{getMoveEmoji(Number(duel.challengerMove))} {MOVES[Number(duel.challengerMove)]}</span>
              ) : (
                <span className="text-yellow-400">🔒 Hidden</span>
              )}
            </div>
          </div>

          <div className="text-center relative">
            <div className={`text-4xl font-black ${clash ? "arena-clash" : "text-monad-purple"}`}>VS</div>
            {clash && <div className="clash-ring" />}
            {isResolved && (
              <div className="mt-2 text-[11px] text-green-400 font-semibold">
                🏆 Winner: {duel.winner.slice(0, 6)}...{duel.winner.slice(-4)}
              </div>
            )}
          </div>

          <div className="sticker-fighter text-center">
            <div className={`fighter-avatar ${targetStateClass}`}>
              <div className={`fighter-aura bg-gradient-to-br ${targetType.aura}`} />
              <span className="fighter-emoji">{targetType.emoji}</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">{targetType.label}</div>
            <div className="text-red-400 font-mono text-xs">{duel.target.slice(0, 6)}...{duel.target.slice(-4)}</div>
            <div className="text-xs text-gray-500">Token #{Number(duel.targetTokenId)} • {formatEther(duel.targetStake)} MON</div>
            <div className="mt-1 text-xs font-semibold">
              {duel.targetRevealed ? (
                <span className="text-green-400">{getMoveEmoji(Number(duel.targetMove))} {MOVES[Number(duel.targetMove)]}</span>
              ) : (
                <span className="text-yellow-400">🔒 Hidden</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span>
            Commit: {Number(duel.commitDeadline) ? new Date(Number(duel.commitDeadline) * 1000).toLocaleTimeString() : "-"}
          </span>
          <span>
            Reveal: {Number(duel.revealDeadline) ? new Date(Number(duel.revealDeadline) * 1000).toLocaleTimeString() : "-"}
          </span>
        </div>
      </div>
    );
  }, [duel]);

  return (
    <div className="space-y-8">
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
            onChange={(event) => setViewDuelId(event.target.value)}
            className="flex-1 bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
          />
        </div>

        {arena}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glow-card">
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <span className="text-2xl">👁️</span> Reveal Move
          </h3>
          <p className="text-gray-500 text-sm mb-4">Your saved move and nonce are auto-loaded from your commit.</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Duel ID</label>
              <input
                type="number"
                min="1"
                value={revealDuelId}
                onChange={(event) => setRevealDuelId(event.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>

            {autoLoaded && (
              <div className="bg-green-900/30 border border-green-800 rounded-lg p-2 text-xs text-green-400">
                ✅ Move and nonce auto-loaded from your saved commitment
              </div>
            )}

            {revealDuel && Number(revealDuel.state) > 0 && (
              <div className="bg-monad-dark/50 rounded-lg p-2 text-xs space-y-1">
                <div>
                  <span className="text-gray-500">State:</span>{" "}
                  <span className={Number(revealDuel.state) === 2 ? "text-yellow-400 font-bold" : "text-gray-400"}>
                    {DUEL_STATES[Number(revealDuel.state)]}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Reveals:</span>{" "}
                  <span className={revealDuel.challengerRevealed ? "text-green-400" : "text-red-400"}>
                    Challenger {revealDuel.challengerRevealed ? "✅" : "❌"}
                  </span>
                  {" | "}
                  <span className={revealDuel.targetRevealed ? "text-green-400" : "text-red-400"}>
                    Target {revealDuel.targetRevealed ? "✅" : "❌"}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-2">
                Your Move {autoLoaded && <span className="text-green-400">(auto)</span>}
              </label>
              <div className="flex gap-2">
                {MOVES.map((moveName, index) => (
                  <button
                    key={moveName}
                    onClick={() => setRevealMove(index as MoveType)}
                    className={`move-btn flex-1 text-sm ${
                      moveName === "STRIKE" ? "move-strike" : moveName === "GUARD" ? "move-guard" : "move-heal"
                    } ${revealMove === index ? "ring-2 ring-white ring-offset-2 ring-offset-monad-dark" : "opacity-60"}`}
                  >
                    {moveName === "STRIKE" ? "⚔️" : moveName === "GUARD" ? "🛡️" : "💚"} {moveName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Nonce {autoLoaded && <span className="text-green-400">(auto)</span>}</label>
              <input
                type="text"
                placeholder="0x..."
                value={revealNonce}
                onChange={(event) => setRevealNonce(event.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={handleReveal}
              disabled={reveal.isPending || reveal.isConfirming || revealMove === null}
              className="primary-btn w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
            >
              {reveal.isPending || reveal.isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Revealing...
                </span>
              ) : (
                `Reveal Move${revealMove !== null ? ` (${MOVES[revealMove]})` : ""}`
              )}
            </button>

            {reveal.isSuccess && <p className="text-green-400 text-sm">✅ Move revealed on-chain!</p>}
            {revealError && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">❌ {revealError}</div>}
            {reveal.error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">⚠️ Reveal failed: {parseWriteError(reveal.error)}</div>}
          </div>
        </div>

        <div className="glow-card">
          <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Resolve Duel
          </h3>
          <p className="text-gray-500 text-sm mb-4">Anyone can call after both reveal (or deadline passes).</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Duel ID</label>
              <input
                type="number"
                min="1"
                value={resolveDuelId}
                onChange={(event) => setResolveDuelId(event.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>

            {resolveDuel && Number(resolveDuel.state) > 0 && (
              <div className="bg-monad-dark/50 rounded-lg p-2 text-xs space-y-1">
                <div>
                  <span className="text-gray-500">State:</span>{" "}
                  <span
                    className={
                      Number(resolveDuel.state) === 3
                        ? "text-green-400 font-bold"
                        : Number(resolveDuel.state) === 4
                        ? "text-red-400 font-bold"
                        : "text-yellow-400"
                    }
                  >
                    {DUEL_STATES[Number(resolveDuel.state)]}
                  </span>
                </div>
                {Number(resolveDuel.state) === 3 && resolveDuel.winner && (
                  <div>
                    <span className="text-gray-500">Winner:</span>{" "}
                    <span className="text-green-400 font-mono">{resolveDuel.winner.slice(0, 6)}...{resolveDuel.winner.slice(-4)}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleResolve}
              disabled={resolveHook.isPending || resolveHook.isConfirming}
              className="primary-btn w-full py-3 rounded-lg bg-gradient-to-r from-monad-purple to-pink-600 hover:opacity-90 text-white font-bold text-lg transition-all disabled:opacity-50"
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
                ✅ Duel resolved! Winner received bounty + stakes.{" "}
                <a href={`https://testnet.monadexplorer.com/tx/${resolveHook.hash}`} target="_blank" className="underline text-monad-purple">
                  View tx
                </a>
              </div>
            )}
            {resolveError && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">❌ {resolveError}</div>}
          </div>

          <div className="mt-6 pt-4 border-t border-monad-border">
            <h4 className="text-sm font-bold text-gray-400 mb-2">Combat Logic (on-chain)</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>⚔️ <b className="text-red-400">STRIKE</b> beats 💚 HEAL (bonus damage)</p>
              <p>🛡️ <b className="text-blue-400">GUARD</b> beats ⚔️ STRIKE (absorbs)</p>
              <p>💚 <b className="text-green-400">HEAL</b> beats 🛡️ GUARD (free recovery)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
