// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// ============================================================
//  AUTONOMOUS BOUNTY DUEL PROTOCOL — Remix-Ready (Monad Testnet)
//  Deploy via Remix → Injected Provider (MetaMask on Monad)
//  Chain ID: 10143 | RPC: https://testnet-rpc.monad.xyz
// ============================================================

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AutonomousBountyDuel is ERC721 {
    // ─── Enums ────────────────────────────────────────────────
    enum Move   { STRIKE, GUARD, HEAL }
    enum DuelState { NONE, CREATED, ACTIVE, RESOLVED, CANCELED }

    // ─── Structs ──────────────────────────────────────────────
    struct Character {
        uint64 hp;
        uint64 attack;
        uint64 defense;
        uint32 wins;
        uint32 losses;
        bool   initialized;
    }

    struct Bounty {
        address poster;
        address target;
        uint256 amount;
        bool    active;
    }

    struct Duel {
        uint256   bountyId;
        address   challenger;
        address   target;
        uint256   challengerTokenId;
        uint256   targetTokenId;
        uint256   challengerStake;
        uint256   targetStake;
        bytes32   challengerCommit;
        bytes32   targetCommit;
        bool      challengerRevealed;
        bool      targetRevealed;
        Move      challengerMove;
        Move      targetMove;
        uint64    commitDeadline;
        uint64    revealDeadline;
        DuelState state;
        address   winner;
    }

    // ─── Constants ────────────────────────────────────────────
    uint64 public constant COMMIT_WINDOW = 20 minutes;
    uint64 public constant REVEAL_WINDOW = 20 minutes;

    // ─── State ────────────────────────────────────────────────
    uint256 public nextTokenId  = 1;
    uint256 public nextBountyId = 1;
    uint256 public nextDuelId   = 1;

    mapping(uint256 => Character) public characters;
    mapping(uint256 => Bounty)    public bounties;
    mapping(uint256 => Duel)      public duels;

    // ─── Events ───────────────────────────────────────────────
    event CharacterMinted(
        address indexed owner, uint256 indexed tokenId,
        uint64 hp, uint64 attack, uint64 defense
    );
    event CharacterUpdated(
        address indexed owner, uint256 indexed tokenId,
        uint64 hp, uint64 attack, uint64 defense,
        uint32 wins, uint32 losses
    );
    event BountyPosted(
        uint256 indexed bountyId, address indexed poster,
        address indexed target, uint256 amount
    );
    event DuelCreated(
        uint256 indexed duelId, uint256 indexed bountyId,
        address indexed challenger, address target,
        uint256 challengerStake, uint64 commitDeadline
    );
    event DuelAccepted(
        uint256 indexed duelId, address indexed target,
        uint256 targetStake, uint64 revealDeadline
    );
    event MoveCommitted(uint256 indexed duelId, address indexed player, bytes32 commitment);
    event MoveRevealed(uint256 indexed duelId, address indexed player, Move move);
    event DuelResolved(
        uint256 indexed duelId, address indexed winner,
        uint256 payout, uint256 bountyAmount, uint256 totalStakes
    );
    event DuelCanceled(uint256 indexed duelId, uint256 returnedStake, uint256 bountyReturned);

    // ─── Constructor ──────────────────────────────────────────
    constructor() ERC721("Monad Duel Character", "MDC") {}

    // ═══════════════════════════════════════════════════════════
    //  1. MINT CHARACTER NFT
    // ═══════════════════════════════════════════════════════════
    function mintCharacter() external returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        characters[tokenId] = Character({
            hp: 100, attack: 12, defense: 8,
            wins: 0, losses: 0, initialized: true
        });
        emit CharacterMinted(msg.sender, tokenId, 100, 12, 8);
    }

    // ═══════════════════════════════════════════════════════════
    //  2. POST BOUNTY (lock native MON against a wallet)
    // ═══════════════════════════════════════════════════════════
    function postBounty(address target) external payable returns (uint256 bountyId) {
        require(target != address(0), "invalid target");
        require(msg.value > 0, "bounty required");
        bountyId = nextBountyId++;
        bounties[bountyId] = Bounty({
            poster: msg.sender, target: target,
            amount: msg.value, active: true
        });
        emit BountyPosted(bountyId, msg.sender, target, msg.value);
    }

    // ═══════════════════════════════════════════════════════════
    //  3. CREATE CHALLENGE (challenger commits + stakes)
    // ═══════════════════════════════════════════════════════════
    function createChallenge(
        uint256 bountyId,
        uint256 challengerTokenId,
        bytes32 challengerCommit
    ) external payable returns (uint256 duelId) {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.active, "bounty inactive");
        require(ownerOf(challengerTokenId) == msg.sender, "not token owner");
        require(msg.sender != bounty.target, "target cannot self-challenge");
        require(challengerCommit != bytes32(0), "empty commit");
        require(msg.value > 0, "stake required");

        duelId = nextDuelId++;
        uint64 commitDeadline = uint64(block.timestamp + COMMIT_WINDOW);

        duels[duelId] = Duel({
            bountyId: bountyId,
            challenger: msg.sender,
            target: bounty.target,
            challengerTokenId: challengerTokenId,
            targetTokenId: 0,
            challengerStake: msg.value,
            targetStake: 0,
            challengerCommit: challengerCommit,
            targetCommit: bytes32(0),
            challengerRevealed: false,
            targetRevealed: false,
            challengerMove: Move.STRIKE,
            targetMove: Move.STRIKE,
            commitDeadline: commitDeadline,
            revealDeadline: 0,
            state: DuelState.CREATED,
            winner: address(0)
        });

        emit MoveCommitted(duelId, msg.sender, challengerCommit);
        emit DuelCreated(duelId, bountyId, msg.sender, bounty.target, msg.value, commitDeadline);
    }

    // ═══════════════════════════════════════════════════════════
    //  4. ACCEPT CHALLENGE (target commits + matches stake)
    // ═══════════════════════════════════════════════════════════
    function acceptChallenge(
        uint256 duelId,
        uint256 targetTokenId,
        bytes32 targetCommit
    ) external payable {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.CREATED, "invalid state");
        require(msg.sender == duel.target, "only target");
        require(block.timestamp <= duel.commitDeadline, "commit expired");
        require(ownerOf(targetTokenId) == msg.sender, "not token owner");
        require(targetCommit != bytes32(0), "empty commit");
        require(msg.value == duel.challengerStake, "stake mismatch");

        duel.targetTokenId = targetTokenId;
        duel.targetStake   = msg.value;
        duel.targetCommit  = targetCommit;
        duel.revealDeadline = uint64(block.timestamp + REVEAL_WINDOW);
        duel.state = DuelState.ACTIVE;

        emit MoveCommitted(duelId, msg.sender, targetCommit);
        emit DuelAccepted(duelId, msg.sender, msg.value, duel.revealDeadline);
    }

    // ═══════════════════════════════════════════════════════════
    //  5. REVEAL MOVE
    // ═══════════════════════════════════════════════════════════
    function revealMove(uint256 duelId, Move move, bytes32 nonce) external {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.ACTIVE, "duel not active");
        require(block.timestamp <= duel.revealDeadline, "reveal expired");

        bytes32 commitment = keccak256(
            abi.encodePacked(duelId, msg.sender, uint8(move), nonce)
        );

        if (msg.sender == duel.challenger) {
            require(!duel.challengerRevealed, "already revealed");
            require(commitment == duel.challengerCommit, "invalid reveal");
            duel.challengerRevealed = true;
            duel.challengerMove = move;
        } else if (msg.sender == duel.target) {
            require(!duel.targetRevealed, "already revealed");
            require(commitment == duel.targetCommit, "invalid reveal");
            duel.targetRevealed = true;
            duel.targetMove = move;
        } else {
            revert("not duel participant");
        }

        emit MoveRevealed(duelId, msg.sender, move);
    }

    // ═══════════════════════════════════════════════════════════
    //  6. RESOLVE DUEL (anyone can call — fully on-chain)
    // ═══════════════════════════════════════════════════════════
    function resolveDuel(uint256 duelId) external {
        Duel storage duel = duels[duelId];
        require(
            duel.state == DuelState.ACTIVE || duel.state == DuelState.CREATED,
            "already finalized"
        );

        // Unaccepted challenge past deadline → cancel + refund
        if (duel.state == DuelState.CREATED) {
            require(block.timestamp > duel.commitDeadline, "still in commit window");
            _cancelUnacceptedDuel(duelId, duel);
            return;
        }

        // If both haven't revealed yet, must be past deadline
        if (!(duel.challengerRevealed && duel.targetRevealed)) {
            require(block.timestamp > duel.revealDeadline, "awaiting reveals");
        }

        address winner;
        if (duel.challengerRevealed && duel.targetRevealed) {
            winner = _determineWinner(duelId, duel);
        } else if (duel.challengerRevealed && !duel.targetRevealed) {
            winner = duel.challenger; // target forfeits
        } else if (!duel.challengerRevealed && duel.targetRevealed) {
            winner = duel.target;     // challenger forfeits
        } else {
            _slashBothForNoReveal(duelId, duel);
            return;
        }

        _finalizeVictory(duelId, duel, winner);
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPER: compute commitment hash (use from frontend)
    // ═══════════════════════════════════════════════════════════
    function computeCommitment(
        uint256 duelId, address player, Move move, bytes32 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(duelId, player, uint8(move), nonce));
    }

    // ─── Getters for frontend ─────────────────────────────────
    function getCharacter(uint256 tokenId) external view returns (Character memory) {
        return characters[tokenId];
    }

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    function getDuel(uint256 duelId) external view returns (Duel memory) {
        return duels[duelId];
    }

    // ─── Internal: Cancel unaccepted ──────────────────────────
    function _cancelUnacceptedDuel(uint256 duelId, Duel storage duel) internal {
        duel.state = DuelState.CANCELED;
        uint256 refund = duel.challengerStake;
        duel.challengerStake = 0;
        (bool ok,) = duel.challenger.call{value: refund}("");
        require(ok, "refund failed");
        emit DuelCanceled(duelId, refund, 0);
    }

    // ─── Internal: Slash both (neither revealed) ──────────────
    function _slashBothForNoReveal(uint256 duelId, Duel storage duel) internal {
        Bounty storage bounty = bounties[duel.bountyId];
        duel.state = DuelState.CANCELED;
        uint256 slashed = duel.challengerStake + duel.targetStake;
        duel.challengerStake = 0;
        duel.targetStake = 0;
        // slashed funds go to bounty poster as penalty
        (bool ok,) = bounty.poster.call{value: slashed}("");
        require(ok, "slash transfer failed");
        emit DuelCanceled(duelId, slashed, bounty.amount);
    }

    // ─── Internal: Determine winner via combat logic ──────────
    function _determineWinner(
        uint256 duelId, Duel storage duel
    ) internal view returns (address) {
        Character storage c1 = characters[duel.challengerTokenId];
        Character storage c2 = characters[duel.targetTokenId];
        require(c1.initialized && c2.initialized, "character missing");

        (uint256 dmgToTarget, uint256 dmgToChallenger) = _computeDamage(
            c1, c2, duel.challengerMove, duel.targetMove
        );

        uint256 targetHpAfter     = c2.hp > dmgToTarget     ? (c2.hp - dmgToTarget)     : 0;
        uint256 challengerHpAfter = c1.hp > dmgToChallenger  ? (c1.hp - dmgToChallenger) : 0;

        if (challengerHpAfter > targetHpAfter) return duel.challenger;
        if (targetHpAfter > challengerHpAfter) return duel.target;

        // Tie-break: deterministic hash
        return uint256(keccak256(abi.encodePacked(duelId, duel.challenger, duel.target))) % 2 == 0
            ? duel.challenger : duel.target;
    }

    // ─── Internal: Rock-Paper-Scissors style damage calc ──────
    //  STRIKE beats HEAL  (bonus damage)
    //  GUARD  beats STRIKE (absorbs)
    //  HEAL   beats GUARD  (free recovery)
    function _computeDamage(
        Character storage challenger,
        Character storage target,
        Move cMove, Move tMove
    ) internal view returns (uint256 dmgToTarget, uint256 dmgToChallenger) {
        uint256 cAtk = challenger.attack;
        uint256 tAtk = target.attack;

        if (cMove == Move.STRIKE && tMove == Move.STRIKE) {
            dmgToTarget     = _pos(cAtk, target.defense / 2);
            dmgToChallenger = _pos(tAtk, challenger.defense / 2);
        } else if (cMove == Move.STRIKE && tMove == Move.GUARD) {
            dmgToTarget     = _pos(cAtk, target.defense + 6);
            dmgToChallenger = 0;
        } else if (cMove == Move.STRIKE && tMove == Move.HEAL) {
            dmgToTarget     = _pos(cAtk + 6, target.defense / 2);
            dmgToChallenger = 0;
        } else if (cMove == Move.GUARD && tMove == Move.STRIKE) {
            dmgToTarget     = 0;
            dmgToChallenger = _pos(tAtk, challenger.defense + 6);
        } else if (cMove == Move.GUARD && tMove == Move.GUARD) {
            dmgToTarget = 0; dmgToChallenger = 0;
        } else if (cMove == Move.GUARD && tMove == Move.HEAL) {
            dmgToTarget = 0; dmgToChallenger = 0;
        } else if (cMove == Move.HEAL && tMove == Move.STRIKE) {
            dmgToTarget     = 0;
            dmgToChallenger = _pos(tAtk + 6, challenger.defense / 2);
        } else if (cMove == Move.HEAL && tMove == Move.GUARD) {
            dmgToTarget = 0; dmgToChallenger = 0;
        } else {
            dmgToTarget = 0; dmgToChallenger = 0;
        }

        // Heal absorbs 8 damage
        if (cMove == Move.HEAL) {
            dmgToChallenger = dmgToChallenger > 8 ? (dmgToChallenger - 8) : 0;
        }
        if (tMove == Move.HEAL) {
            dmgToTarget = dmgToTarget > 8 ? (dmgToTarget - 8) : 0;
        }
    }

    // ─── Internal: Finalize victory ───────────────────────────
    function _finalizeVictory(
        uint256 duelId, Duel storage duel, address winner
    ) internal {
        Bounty storage bounty = bounties[duel.bountyId];
        require(bounty.active, "bounty inactive");

        duel.state  = DuelState.RESOLVED;
        duel.winner = winner;

        address loser        = winner == duel.challenger ? duel.target : duel.challenger;
        uint256 winnerTkn    = winner == duel.challenger ? duel.challengerTokenId : duel.targetTokenId;
        uint256 loserTkn     = winner == duel.challenger ? duel.targetTokenId : duel.challengerTokenId;

        Character storage wc = characters[winnerTkn];
        Character storage lc = characters[loserTkn];

        wc.wins   += 1;
        if (wc.attack < type(uint64).max - 1) wc.attack += 1;
        lc.losses += 1;
        if (lc.defense < type(uint64).max - 1) lc.defense += 1;

        uint256 bountyAmt   = bounty.amount;
        uint256 totalStakes = duel.challengerStake + duel.targetStake;
        uint256 payout      = bountyAmt + totalStakes;

        bounty.active = false;
        bounty.amount = 0;
        duel.challengerStake = 0;
        duel.targetStake     = 0;

        (bool ok,) = winner.call{value: payout}("");
        require(ok, "payout failed");

        emit DuelResolved(duelId, winner, payout, bountyAmt, totalStakes);
        emit CharacterUpdated(winner, winnerTkn, wc.hp, wc.attack, wc.defense, wc.wins, wc.losses);
        emit CharacterUpdated(loser,  loserTkn,  lc.hp, lc.attack, lc.defense, lc.wins, lc.losses);
    }

    function _pos(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? (x - y) : 0;
    }
}
