"use client";

import { useAccount } from "wagmi";
import { useNextTokenId, useNextBountyId, useNextDuelId } from "@/hooks/useContract";
import { formatEther } from "viem";
import { useBalance } from "wagmi";

export function StatsBar() {
  const { address } = useAccount();
  const { data: nextToken } = useNextTokenId();
  const { data: nextBounty } = useNextBountyId();
  const { data: nextDuel } = useNextDuelId();
  const { data: balance } = useBalance({ address });

  const stats = [
    {
      label: "Your Balance",
      value: balance ? `${parseFloat(formatEther(balance.value)).toFixed(3)} MON` : "...",
      color: "text-green-400",
    },
    {
      label: "Characters Minted",
      value: nextToken ? String(Number(nextToken) - 1) : "...",
      color: "text-monad-purple",
    },
    {
      label: "Active Bounties",
      value: nextBounty ? String(Number(nextBounty) - 1) : "...",
      color: "text-yellow-400",
    },
    {
      label: "Total Duels",
      value: nextDuel ? String(Number(nextDuel) - 1) : "...",
      color: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="glow-card !p-4 text-center">
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
