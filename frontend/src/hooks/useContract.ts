import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { DUEL_ABI } from "@/config/abi";
import { CONTRACT_ADDRESS, monadTestnet } from "@/config/chain";
import { parseEther, keccak256, encodePacked } from "viem";

// ─── Helpers ────────────────────────────────────────────────
export const MOVES = ["STRIKE", "GUARD", "HEAL"] as const;
export type MoveType = 0 | 1 | 2;

export function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ("0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
}

export function computeCommitment(
  duelId: bigint,
  player: `0x${string}`,
  move: MoveType,
  nonce: `0x${string}`
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["uint256", "address", "uint8", "bytes32"],
      [duelId, player, move, nonce]
    )
  );
}

export const DUEL_STATES = ["NONE", "CREATED", "ACTIVE", "RESOLVED", "CANCELED"] as const;

// ─── Commitment Storage (localStorage) ─────────────────────
export interface CommitmentData {
  duelId: string;
  move: MoveType;
  nonce: string;
  address: string;
  role: "challenger" | "target";
  timestamp: number;
}

const STORAGE_KEY = "bounty-duel-commitments";

export function saveCommitment(data: CommitmentData) {
  try {
    const existing = getAllCommitments();
    const key = `${data.duelId}-${data.address.toLowerCase()}`;
    existing[key] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function getCommitment(duelId: string, address: string): CommitmentData | null {
  try {
    const all = getAllCommitments();
    return all[`${duelId}-${address.toLowerCase()}`] || null;
  } catch {
    return null;
  }
}

function getAllCommitments(): Record<string, CommitmentData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ─── Read Hooks ─────────────────────────────────────────────
export function useCharacter(tokenId: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "getCharacter",
    args: [tokenId],
    query: { enabled: tokenId > 0n },
  });
}

export function useBounty(bountyId: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "getBounty",
    args: [bountyId],
    query: { enabled: bountyId > 0n },
  });
}

export function useDuel(duelId: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "getDuel",
    args: [duelId],
    query: { enabled: duelId > 0n },
  });
}

export function useOwnerOf(tokenId: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "ownerOf",
    args: [tokenId],
    query: { enabled: tokenId > 0n },
  });
}

export function useNextTokenId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "nextTokenId",
  });
}

export function useNextBountyId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "nextBountyId",
  });
}

export function useNextDuelId() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DUEL_ABI,
    functionName: "nextDuelId",
  });
}

// ─── Write Hooks ────────────────────────────────────────────
export function useMintCharacter() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const mint = () => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "mintCharacter",
    });
  };

  return { mint, isPending, isConfirming, isSuccess, hash };
}

export function usePostBounty() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const post = (target: `0x${string}`, amountMON: string) => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "postBounty",
      args: [target],
      value: parseEther(amountMON),
    });
  };

  return { post, isPending, isConfirming, isSuccess, hash };
}

export function useCreateChallenge() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = (
    bountyId: bigint,
    tokenId: bigint,
    commit: `0x${string}`,
    stakeMON: string
  ) => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "createChallenge",
      args: [bountyId, tokenId, commit],
      value: parseEther(stakeMON),
    });
  };

  return { create, isPending, isConfirming, isSuccess, hash };
}

export function useAcceptChallenge() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const accept = (
    duelId: bigint,
    tokenId: bigint,
    commit: `0x${string}`,
    stakeWei: bigint
  ) => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "acceptChallenge",
      args: [duelId, tokenId, commit],
      value: stakeWei,
    });
  };

  return { accept, isPending, isConfirming, isSuccess, hash, error };
}

export function useRevealMove() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const reveal = (duelId: bigint, move: MoveType, nonce: `0x${string}`) => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "revealMove",
      args: [duelId, move, nonce],
    });
  };

  return { reveal, isPending, isConfirming, isSuccess, hash, error };
}

export function useResolveDuel() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const resolve = (duelId: bigint) => {
    if (!address) return;

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: DUEL_ABI,
      chain: monadTestnet,
      account: address,
      functionName: "resolveDuel",
      args: [duelId],
    });
  };

  return { resolve, isPending, isConfirming, isSuccess, hash };
}
