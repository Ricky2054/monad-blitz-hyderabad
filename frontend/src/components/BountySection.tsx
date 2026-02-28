"use client";

import { useState } from "react";
import { usePostBounty } from "@/hooks/useContract";

export function BountySection() {
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const { post, isPending, isConfirming, isSuccess, hash } = usePostBounty();

  const loading = isPending || isConfirming;

  const handlePost = () => {
    if (!target || !amount) return;
    post(target as `0x${string}`, amount);
  };

  return (
    <div className="glow-card">
      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
        <span className="text-2xl">🎯</span> Post Bounty
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        Lock MON against any wallet. Anyone can challenge the target to claim it.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Target Wallet</label>
          <input
            type="text"
            placeholder="0x..."
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Bounty Amount (MON)</label>
          <input
            type="text"
            placeholder="0.1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
          />
        </div>

        <button
          onClick={handlePost}
          disabled={loading || !target || !amount}
          className="primary-btn w-full py-3 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-bold transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="spinner" /> {isPending ? "Confirm..." : "Posting..."}
            </span>
          ) : (
            `Post Bounty (${amount || "0"} MON)`
          )}
        </button>

        {isSuccess && hash && (
          <p className="text-green-400 text-sm">
            ✅ Bounty posted!{" "}
            <a
              href={`https://testnet.monadexplorer.com/tx/${hash}`}
              target="_blank"
              className="underline text-monad-purple"
            >
              View tx
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
