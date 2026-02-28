# ⚔️ Autonomous Bounty Duel Protocol

> **Fully on-chain PvP bounty settlement layer on Monad** — No off-chain referee. No trusted third party. Just cryptographic commitment, deterministic combat, and automatic escrow settlement at 10,000 TPS.

![Monad](https://img.shields.io/badge/Monad-Testnet-836EF9?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🎯 What Is This?

A decentralized **PvP bounty and settlement protocol** where:

1. **Users mint ERC-721 character NFTs** with on-chain stats (HP, ATK, DEF)
2. **Anyone can post a bounty** by locking native MON tokens against a specific wallet address
3. **Challengers initiate commit-reveal duels** against the bounty target
4. **Both players stake funds**, submit hashed moves, reveal them on-chain
5. **The smart contract resolves combat** entirely on-chain using deterministic logic
6. **Winner automatically receives** bounty + all stakes; NFT stats update permanently

**No off-chain referee. No oracle. No admin. Everything is verifiable on-chain.**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MONAD BLOCKCHAIN                       │
│                  (400ms blocks, 10K TPS)                  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │          AutonomousBountyDuel.sol (Single Contract)   │ │
│  │                                                        │ │
│  │  ERC-721 Character NFTs ──► On-chain HP/ATK/DEF       │ │
│  │  Bounty Escrow ──────────► Lock MON vs target wallet  │ │
│  │  Commit-Reveal Duels ───► Cryptographic fairness      │ │
│  │  Combat Resolution ─────► Deterministic on-chain      │ │
│  │  Auto Settlement ───────► Winner gets bounty+stakes   │ │
│  │  Stat Mutation ──────────► NFTs evolve after duels    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  Parallel Duel Execution ─► Multiple duels simultaneously │
│  800ms Finality ──────────► Near-instant settlement       │
└─────────────────────────────────────────────────────────┘
```

---

## ⚡ Why Monad?

| Feature | How This Protocol Uses It |
|---|---|
| **10,000 TPS** | Hundreds of parallel duels can execute simultaneously |
| **400ms blocks** | Commit-reveal phases feel instant |
| **800ms finality** | Settlement is final in under a second |
| **EVM compatible** | Standard Solidity, standard tools, standard wallets |
| **Parallel execution** | Independent duel state allows true parallel processing |

---

## 🎮 Combat System

**Rock-Paper-Scissors style with NFT stat modifiers:**

| | STRIKE | GUARD | HEAL |
|---|---|---|---|
| **STRIKE** | Both take ATK-DEF/2 dmg | Reduced by DEF+6 | Bonus +6 ATK damage |
| **GUARD** | Absorbs (DEF+6) | No damage | No damage |
| **HEAL** | Takes bonus damage | Free recovery | Both heal |

- Winner = higher remaining HP after damage calculation
- Ties broken by deterministic on-chain hash
- Winner's ATK increases permanently (+1)
- Loser's DEF increases permanently (+1)

---

## 🚀 Quick Start

### 1. Deploy Contract (Remix)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Copy `contracts/AutonomousBountyDuel_Remix.sol` into Remix
3. Compiler: `0.8.26`, optimizer: `200 runs`
4. Deploy tab → Environment: **Injected Provider (MetaMask)**
5. Set MetaMask to Monad Testnet:
   - **RPC:** `https://testnet-rpc.monad.xyz`
   - **Chain ID:** `10143`
   - **Symbol:** `MON`
6. Get testnet MON from [blitz.devnads.com](https://blitz.devnads.com/)
7. Click **Deploy** → Copy the contract address

### 2. Run Frontend

```bash
cd frontend
npm install
```

Edit `src/config/chain.ts` — paste your deployed contract address:
```typescript
export const CONTRACT_ADDRESS = "0xYOUR_CONTRACT_ADDRESS" as `0x${string}`;
```

```bash
npm run dev
```

Open `http://localhost:3000`

### 3. Demo Flow

1. **Connect wallet** (MetaMask on Monad Testnet)
2. **Mint a character** → get Token #1
3. **Post a bounty** against another wallet (e.g., your second test wallet)
4. **Create a challenge** → pick a secret move (STRIKE/GUARD/HEAL) → stake MON
5. **Target accepts** → picks their secret move → matches stake
6. **Both reveal** their moves using saved nonces
7. **Anyone resolves** → contract determines winner → payout is automatic

---

## 📁 Project Structure

```
├── contracts/
│   ├── AutonomousBountyDuel.sol          # Full contract (Hardhat)
│   └── AutonomousBountyDuel_Remix.sol    # Remix-ready version
├── frontend/
│   ├── src/
│   │   ├── app/                          # Next.js pages
│   │   ├── components/                   # UI components
│   │   │   ├── MintSection.tsx           # Mint character NFTs
│   │   │   ├── BountySection.tsx         # Post bounties
│   │   │   ├── ChallengeSection.tsx      # Create/accept challenges
│   │   │   ├── DuelArena.tsx             # View duels, reveal, resolve
│   │   │   └── StatsBar.tsx              # Protocol stats
│   │   ├── config/
│   │   │   ├── abi.ts                    # Contract ABI
│   │   │   └── chain.ts                  # Monad testnet config
│   │   ├── hooks/
│   │   │   └── useContract.ts            # All wagmi hooks
│   │   └── providers.tsx                 # RainbowKit + wagmi setup
│   └── package.json
├── scripts/deploy.js                     # Hardhat deploy script
├── test/AutonomousBountyDuel.js          # Hardhat tests
└── README.md
```

---

## 🔒 Security Design

| Mechanism | Purpose |
|---|---|
| **Commit-Reveal** | Prevents front-running of moves |
| **Equal Stakes** | Both parties have skin in the game |
| **Escrow** | Funds locked in contract until resolution |
| **Timeout Penalties** | No-reveal = forfeit stake to opponent |
| **No-Accept Refund** | Unaccepted challenges refund challenger |
| **Both-Forfeit Slash** | If neither reveals, bounty poster gets all stakes |
| **Deterministic Tie-break** | Hash-based, non-manipulable |

---

## 🏆 Why This Is First-Prize Material

1. **Not a game — it's infrastructure.** A decentralized PvP settlement and bounty layer.
2. **100% on-chain.** No off-chain referee, oracle, or multisig needed.
3. **Monad-native design.** Parallel duel execution leverages Monad's core innovation.
4. **Adversarial game theory.** Commit-reveal + escrow + slashing = rational participation.
5. **Extensible.** Any dApp can permissionlessly use this as a dispute resolution layer.

---

## 📜 License

MIT

---

Built with ⚡ for **Monad Blitz Hyderabad** — February 28, 2026
