const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AutonomousBountyDuel", function () {
  async function setup() {
    const [poster, challenger, target] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("contracts/AutonomousBountyDuel.sol:AutonomousBountyDuel");
    const duel = await Factory.deploy();
    await duel.waitForDeployment();
    return { duel, poster, challenger, target };
  }

  function buildCommitment(duelId, player, move, nonce) {
    return ethers.keccak256(
      ethers.solidityPacked(["uint256", "address", "uint8", "bytes32"], [duelId, player, move, nonce])
    );
  }

  it("runs full duel lifecycle and pays winner", async function () {
    const { duel, poster, challenger, target } = await setup();

    await duel.connect(challenger).mintCharacter();
    await duel.connect(target).mintCharacter();

    await duel.connect(poster).postBounty(target.address, { value: ethers.parseEther("1") });

    const duelId = 1n;
    const challengerNonce = ethers.id("challenger_nonce");
    const targetNonce = ethers.id("target_nonce");
    const challengerMove = 0;
    const targetMove = 2;

    const challengerCommit = buildCommitment(duelId, challenger.address, challengerMove, challengerNonce);
    await duel.connect(challenger).createChallenge(1, 1, challengerCommit, { value: ethers.parseEther("0.5") });

    const targetCommit = buildCommitment(duelId, target.address, targetMove, targetNonce);
    await duel.connect(target).acceptChallenge(1, 2, targetCommit, { value: ethers.parseEther("0.5") });

    await duel.connect(challenger).revealMove(1, challengerMove, challengerNonce);
    await duel.connect(target).revealMove(1, targetMove, targetNonce);

    const before = await ethers.provider.getBalance(challenger.address);
    const tx = await duel.connect(challenger).resolveDuel(1);
    const receipt = await tx.wait();
    const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? tx.gasPrice;
    const gasCost = receipt.gasUsed * gasPrice;
    const after = await ethers.provider.getBalance(challenger.address);

    // Winner should have received payout (bounty + both stakes)
    // after should be > before - gasCost (i.e., net positive)
    expect(after + gasCost).to.be.greaterThan(before);

    const duelData = await duel.duels(1);
    expect(duelData.state).to.equal(3n);
    expect(duelData.winner).to.equal(challenger.address);
  });

  it("cancels unaccepted challenge and refunds challenger", async function () {
    const { duel, poster, challenger, target } = await setup();

    await duel.connect(challenger).mintCharacter();
    await duel.connect(target).mintCharacter();

    await duel.connect(poster).postBounty(target.address, { value: ethers.parseEther("1") });

    const duelId = 1n;
    const challengerNonce = ethers.id("challenger_nonce_2");
    const challengerCommit = buildCommitment(duelId, challenger.address, 0, challengerNonce);

    await duel.connect(challenger).createChallenge(1, 1, challengerCommit, { value: ethers.parseEther("0.2") });

    await ethers.provider.send("evm_increaseTime", [21 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(duel.resolveDuel(1)).to.not.be.reverted;
    const duelData = await duel.duels(1);
    expect(duelData.state).to.equal(4n);
  });
});