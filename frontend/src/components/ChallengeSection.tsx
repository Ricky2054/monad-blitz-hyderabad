"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  useCreateChallenge,
  useAcceptChallenge,
  useBounty,
  useDuel,
  useNextDuelId,
  useNextBountyId,
  useNextTokenId,
  computeCommitment,
  generateNonce,
  MOVES,
  MoveType,
} from "@/hooks/useContract";

export function ChallengeSection() {
  const { address } = useAccount();

  // ─── Create Challenge ─────
  const [bountyId, setBountyId] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [stake, setStake] = useState("");
  const [selectedMove, setSelectedMove] = useState<MoveType | null>(null);
  const [savedNonce, setSavedNonce] = useState<string>("");
  const { create, isPending, isConfirming, isSuccess, hash } = useCreateChallenge();

  // ─── Accept Challenge ─────
  const [acceptDuelId, setAcceptDuelId] = useState("");
  const [acceptTokenId, setAcceptTokenId] = useState("");
  const [acceptStake, setAcceptStake] = useState("");
  const [acceptMove, setAcceptMove] = useState<MoveType | null>(null);
  const [acceptNonce, setAcceptNonce] = useState<string>("");
  const accept = useAcceptChallenge();

  // ─── Bounty preview ───
  const { data: bounty } = useBounty(BigInt(bountyId || "0"));
  const { data: nextDuelId } = useNextDuelId();
  const { data: nextBountyId } = useNextBountyId();
  const { data: nextTokenId } = useNextTokenId();
  const { data: acceptDuelData } = useDuel(BigInt(acceptDuelId || "0"));
  const [createError, setCreateError] = useState<string>("");
  const [acceptError, setAcceptError] = useState<string>("");

  const handleCreateChallenge = () => {
    setCreateError("");
    if (!bountyId || !tokenId || !stake || selectedMove === null || !address || !nextDuelId) {
      setCreateError("Fill all fields: Bounty ID, Token ID, Move, and Stake.");
      return;
    }
    // Validate bounty exists
    if (nextBountyId && BigInt(bountyId) >= nextBountyId) {
      setCreateError(`Bounty #${bountyId} doesn't exist. Max ID: ${Number(nextBountyId) - 1}`);
      return;
    }
    if (!bounty || !bounty.active) {
      setCreateError(`Bounty #${bountyId} is inactive or doesn't exist.`);
      return;
    }
    if (bounty.target.toLowerCase() === address.toLowerCase()) {
      setCreateError("You are the target of this bounty — you can't challenge yourself. Use a different wallet.");
      return;
    }
    const nonce = generateNonce();
    setSavedNonce(nonce);

    const expectedDuelId = nextDuelId;

    const commit = computeCommitment(expectedDuelId, address, selectedMove, nonce as `0x${string}`);
    create(BigInt(bountyId), BigInt(tokenId), commit, stake);
  };

  const handleAcceptChallenge = () => {
    setAcceptError("");
    if (!acceptDuelId || !acceptTokenId || !acceptStake || acceptMove === null || !address) {
      setAcceptError("Fill all fields: Duel ID, Token ID, Move, and Stake.");
      return;
    }
    if (acceptDuelData && acceptDuelData.target.toLowerCase() !== address.toLowerCase()) {
      setAcceptError("You are not the target of this duel. Only the bounty target can accept.");
      return;
    }
    const nonce = generateNonce();
    setAcceptNonce(nonce);
    const commit = computeCommitment(
      BigInt(acceptDuelId),
      address,
      acceptMove,
      nonce as `0x${string}`
    );
    accept.accept(BigInt(acceptDuelId), BigInt(acceptTokenId), commit, acceptStake);
  };

  const loading = isPending || isConfirming;
  const aLoading = accept.isPending || accept.isConfirming;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Create Challenge */}
      <div className="glow-card">
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
          <span className="text-2xl">⚡</span> Create Challenge
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          Pick a bounty, choose your move secretly, and stake MON to challenge.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Bounty ID {nextBountyId ? <span className="text-monad-purple">(1—{Number(nextBountyId) - 1})</span> : null}</label>
              <input
                type="number"
                min="1"
                max={nextBountyId ? Number(nextBountyId) - 1 : undefined}
                value={bountyId}
                onChange={(e) => { setBountyId(e.target.value); setCreateError(""); }}
                placeholder={nextBountyId ? `1-${Number(nextBountyId) - 1}` : "1"}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Your Token ID {nextTokenId ? <span className="text-monad-purple">(1—{Number(nextTokenId) - 1})</span> : null}</label>
              <input
                type="number"
                min="1"
                max={nextTokenId ? Number(nextTokenId) - 1 : undefined}
                value={tokenId}
                onChange={(e) => { setTokenId(e.target.value); setCreateError(""); }}
                placeholder={nextTokenId ? `1-${Number(nextTokenId) - 1}` : "1"}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          {bounty && bounty.active && (
            <div className="bg-monad-dark/50 rounded-lg p-3 text-sm">
              <span className="text-gray-500">Target:</span>{" "}
              <span className="text-white font-mono text-xs">
                {bounty.target.slice(0, 6)}...{bounty.target.slice(-4)}
              </span>
              {" | "}
              <span className="text-yellow-400 font-bold">
                {(Number(bounty.amount) / 1e18).toFixed(4)} MON
              </span>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-2">Your Secret Move</label>
            <div className="flex gap-2">
              {MOVES.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMove(i as MoveType)}
                  className={`move-btn flex-1 ${
                    m === "STRIKE"
                      ? "move-strike"
                      : m === "GUARD"
                      ? "move-guard"
                      : "move-heal"
                  } ${selectedMove === i ? "ring-2 ring-white ring-offset-2 ring-offset-monad-dark" : "opacity-60"}`}
                >
                  {m === "STRIKE" ? "⚔️" : m === "GUARD" ? "🛡️" : "💚"} {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Stake (MON)</label>
            <input
              type="text"
              placeholder="0.05"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
            />
          </div>

          <button
            onClick={handleCreateChallenge}
            disabled={loading || selectedMove === null}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" /> Sending...
              </span>
            ) : (
              "Create Challenge"
            )}
          </button>

          {isSuccess && savedNonce && (
            <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
              <p className="text-green-400">✅ Challenge created! Duel ID: {nextDuelId ? String(Number(nextDuelId) - 1) : "?"}</p>
              <p className="text-yellow-300 mt-1 font-bold">
                ⚠️ SAVE YOUR NONCE (needed for reveal):
              </p>
              <code className="text-xs text-gray-300 break-all block mt-1 bg-monad-dark p-2 rounded">
                {savedNonce}
              </code>
            </div>
          )}

          {createError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">
              ❌ {createError}
            </div>
          )}
        </div>
      </div>

      {/* Accept Challenge */}
      <div className="glow-card">
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
          <span className="text-2xl">🤝</span> Accept Challenge
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          If you&apos;re the target, accept by committing your secret move + matching stake.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Duel ID</label>
              <input
                type="number"
                min="1"
                value={acceptDuelId}
                onChange={(e) => { setAcceptDuelId(e.target.value); setAcceptError(""); }}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Your Token ID {nextTokenId ? <span className="text-monad-purple">(1—{Number(nextTokenId) - 1})</span> : null}</label>
              <input
                type="number"
                min="1"
                value={acceptTokenId}
                onChange={(e) => setAcceptTokenId(e.target.value)}
                className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-2">Your Secret Move</label>
            <div className="flex gap-2">
              {MOVES.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setAcceptMove(i as MoveType)}
                  className={`move-btn flex-1 ${
                    m === "STRIKE"
                      ? "move-strike"
                      : m === "GUARD"
                      ? "move-guard"
                      : "move-heal"
                  } ${acceptMove === i ? "ring-2 ring-white ring-offset-2 ring-offset-monad-dark" : "opacity-60"}`}
                >
                  {m === "STRIKE" ? "⚔️" : m === "GUARD" ? "🛡️" : "💚"} {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Stake (MON) — must match challenger</label>
            <input
              type="text"
              placeholder="0.05"
              value={acceptStake}
              onChange={(e) => setAcceptStake(e.target.value)}
              className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
            />
          </div>

          <button
            onClick={handleAcceptChallenge}
            disabled={aLoading || acceptMove === null}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50"
          >
            {aLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" /> Sending...
              </span>
            ) : (
              "Accept Challenge"
            )}
          </button>

          {accept.isSuccess && acceptNonce && (
            <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-sm">
              <p className="text-green-400">✅ Challenge accepted! Duel is now ACTIVE.</p>
              <p className="text-yellow-300 mt-1 font-bold">
                ⚠️ SAVE YOUR NONCE (needed for reveal):
              </p>
              <code className="text-xs text-gray-300 break-all block mt-1 bg-monad-dark p-2 rounded">
                {acceptNonce}
              </code>
            </div>
          )}

          {acceptError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-400">
              ❌ {acceptError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
