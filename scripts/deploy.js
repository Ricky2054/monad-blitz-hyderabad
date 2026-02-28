const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const factory = await hre.ethers.getContractFactory("contracts/AutonomousBountyDuel.sol:AutonomousBountyDuel");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  console.log("AutonomousBountyDuel deployed at:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});