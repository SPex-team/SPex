// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  let [owner] = await ethers.getSigners();

  const LoanTimelock = await ethers.getContractFactory("LoanTimelock");
  const loanTimelock = await LoanTimelock.deploy(
    1,
    ["0xad252C0b07c0dCC40137E305Af5f67739AE2A656"],
    ["0xad252C0b07c0dCC40137E305Af5f67739AE2A656"],
    "0xad252C0b07c0dCC40137E305Af5f67739AE2A656"
  );

  console.log(`LoanTimelock deployed to ${loanTimelock.target}`);

  const LoanGovernanceToken = await ethers.getContractFactory("LoanGovernanceToken");
  const loanGovernanceToken = await LoanGovernanceToken.deploy();

  console.log(`LoanGovernanceToken deployed to ${loanGovernanceToken.target}`);

  const LoanGovernor = await ethers.getContractFactory("LoanGovernor");
  const loanGovernor = await LoanGovernor.deploy(
    loanGovernanceToken.target
  );
  console.log(`LoanGovernor deployed to ${loanGovernor.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
