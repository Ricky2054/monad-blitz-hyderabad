"use client";

import { useState } from "react";
import { useMintCharacter, useCharacter, useNextTokenId } from "@/hooks/useContract";
import { useAccount } from "wagmi";

export function MintSection() {
  const { address } = useAccount();
  const { mint, isPending, isConfirming, isSuccess, hash } = useMintCharacter();
  const { data: nextToken } = useNextTokenId();
  const [viewTokenId, setViewTokenId] = useState<string>("");
  const { data: character } = useCharacter(BigInt(viewTokenId || "0"));

  const loading = isPending || isConfirming;

  return (
    <div className="glow-card">
      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
        <span className="text-2xl">⚔️</span> Mint Fighter NFT
      </h3>
      <p className="text-gray-500 text-sm mb-4">
        ERC-721 with on-chain stats: HP 100 | ATK 12 | DEF 8
      </p>

      <button
        onClick={mint}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-monad-purple hover:bg-monad-purple/80 text-white font-bold text-lg transition-all disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner" /> {isPending ? "Confirm in wallet..." : "Confirming..."}
          </span>
        ) : (
          "Mint Character"
        )}
      </button>

      {isSuccess && hash && (
        <p className="text-green-400 text-sm mt-2">
          ✅ Minted! Token #{nextToken ? String(Number(nextToken) - 1) : "?"}{" "}
          <a
            href={`https://testnet.monadexplorer.com/tx/${hash}`}
            target="_blank"
            className="underline text-monad-purple"
          >
            View tx
          </a>
        </p>
      )}

      {/* View character stats */}
      <div className="mt-6 pt-4 border-t border-monad-border">
        <label className="text-sm text-gray-400 block mb-2">View Character Stats</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            placeholder="Token ID"
            value={viewTokenId}
            onChange={(e) => setViewTokenId(e.target.value)}
            className="flex-1 bg-monad-dark border border-monad-border rounded-lg px-3 py-2 text-white"
          />
        </div>

        {character && character.initialized && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "HP", value: Number(character.hp), max: 150, color: "bg-red-500" },
              { label: "ATK", value: Number(character.attack), max: 50, color: "bg-orange-500" },
              { label: "DEF", value: Number(character.defense), max: 50, color: "bg-blue-500" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-lg font-bold">{s.value}</div>
                <div className="w-full bg-monad-border rounded-full h-1.5 mt-1">
                  <div
                    className={`${s.color} h-1.5 rounded-full transition-all`}
                    style={{ width: `${(s.value / s.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="col-span-3 flex justify-center gap-6 mt-2 text-sm">
              <span className="text-green-400">W: {Number(character.wins)}</span>
              <span className="text-red-400">L: {Number(character.losses)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
