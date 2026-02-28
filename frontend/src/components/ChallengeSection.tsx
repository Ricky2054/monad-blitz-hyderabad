"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  useCreateChallenge,
  useAcceptChallenge,
  useBounty,
  useDuel,
  useOwnerOf,
  useNextDuelId,
  useNextBountyId,
  useNextTokenId,
  computeCommitment,
  generateNonce,
  saveCommitment,
  MOVES,
  DUEL_STATES,
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
  const [acceptMove, setAcceptMove] = useState<MoveType | null>(null);
  const [acceptNonce, setAcceptNonce] = useState<string>("");
  const accept = useAcceptChallenge();

  // ─── Bounty preview ───
  const { data: bounty } = useBounty(BigInt(bountyId || "0"));
  const { data: nextDuelId } = useNextDuelId();
  const { data: nextBountyId } = useNextBountyId();
  const { data: nextTokenId } = useNextTokenId();
  const { data: acceptDuelData } = useDuel(BigInt(acceptDuelId || "0"));
  const {
    data: acceptTokenOwner,
    isError: isAcceptTokenOwnerError,
  } = useOwnerOf(BigInt(acceptTokenId || "0"));
  const [createError, setCreateError] = useState<string>("");
  const [acceptError, setAcceptError] = useState<string>("");

  const parseWriteError = (error?: Error | null) => {
    if (!error) return "";
    const message = error.message || "";
    const executionReverted = message.match(/execution reverted(?::\s*)?([^\n]*)/i);
    if (executionReverted?.[1]) return executionReverted[1].trim();
    const details = message.match(/Details:\s*([^\n]+)/i);
    if (details?.[1]) return details[1].trim();
    return message.split("\n")[0] || "Transaction reverted.";
  };

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
    // Save to localStorage so DuelArena can auto-load for reveal
    saveCommitment({
      duelId: String(expectedDuelId),
      move: selectedMove,
      nonce,
      address,
      role: "challenger",
      timestamp: Date.now(),
    });
    create(BigInt(bountyId), BigInt(tokenId), commit, stake);
  };

  const handleAcceptChallenge = () => {
    setAcceptError("");
    if (!acceptDuelId || !acceptTokenId || acceptMove === null || !address) {
      setAcceptError("Fill all fields: Duel ID, Token ID, and Move.");
      return;
    }
    if (!acceptDuelData || Number(acceptDuelData.state) === 0) {
      setAcceptError(`Duel #${acceptDuelId} doesn't exist.`);
      return;
    }
    if (Number(acceptDuelData.state) !== 1) {
      setAcceptError(`Duel #${acceptDuelId} is not in CREATED state (current: ${DUEL_STATES[Number(acceptDuelData.state)]}).`);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    if (Number(acceptDuelData.commitDeadline) > 0 && now > Number(acceptDuelData.commitDeadline)) {
      setAcceptError("Commit window expired for this duel. Ask challenger to create a new challenge.");
      return;
    }
    if (acceptDuelData.target.toLowerCase() !== address.toLowerCase()) {
      setAcceptError(`You are not the target. Target is ${acceptDuelData.target.slice(0,6)}...${acceptDuelData.target.slice(-4)}. Switch wallet.`);
      return;
    }
    if (isAcceptTokenOwnerError) {
      setAcceptError(`Token #${acceptTokenId} does not exist yet or cannot be read on this contract.`);
      return;
    }
    if (!acceptTokenOwner || acceptTokenOwner.toLowerCase() !== address.toLowerCase()) {
      setAcceptError(`Token #${acceptTokenId} is not owned by connected wallet.`);
      return;
    }
    const requiredStake = acceptDuelData.challengerStake;
    if (requiredStake === 0n) {
      setAcceptError("Invalid duel: challenger stake is 0.");
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
    // Save to localStorage so DuelArena can auto-load for reveal
    saveCommitment({
      duelId: acceptDuelId,
      move: acceptMove,
      nonce,
      address,
      role: "target",
      timestamp: Date.now(),
    });
    // Send exact challengerStake in wei — no manual input needed
    accept.accept(BigInt(acceptDuelId), BigInt(acceptTokenId), commit, requiredStake);
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
                onChange={(e) => { setAcceptTokenId(e.target.value); setAcceptError(""); }}
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

          {/* Auto-read stake from duel data */}
          {acceptDuelData && Number(acceptDuelData.state) === 1 && (
            <div className="bg-monad-dark/50 rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-gray-500">Challenger:</span> <span className="text-monad-purple font-mono text-xs">{acceptDuelData.challenger.slice(0,6)}...{acceptDuelData.challenger.slice(-4)}</span></div>
              <div><span className="text-gray-500">Required Stake:</span> <span className="text-yellow-400 font-bold">{(Number(acceptDuelData.challengerStake) / 1e18).toFixed(4)} MON</span> <span className="text-green-400 text-xs">(auto-matched)</span></div>
              <div><span className="text-gray-500">State:</span> <span className="text-blue-400">{DUEL_STATES[Number(acceptDuelData.state)]}</span></div>
            </div>
          )}

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
              acceptDuelData && Number(acceptDuelData.state) === 1
                ? `Accept Challenge (${(Number(acceptDuelData.challengerStake) / 1e18).toFixed(4)} MON)`
                : "Accept Challenge"
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

          {accept.error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-sm text-red-300">
              ⚠️ Accept failed: {parseWriteError(accept.error)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
