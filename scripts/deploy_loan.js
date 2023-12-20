const { ethers, upgrades } = require("hardhat");

async function main() {

  let [owner] = await ethers.getSigners()
  const LoanGovernanceToken = await ethers.getContractFactory("LoanGovernanceToken");
  const loanGovernanceToken = await LoanGovernanceToken.deploy(owner.address)

  console.log("LoanGovernanceToken deployed to: ", loanGovernanceToken.target)

  const Loan = await ethers.getContractFactory("Loan");
  const loan = await upgrades.deployProxy(Loan, [loanGovernanceToken.target], {
    unsafeAllow: ["delegatecall"],
  });
  await loan.waitForDeployment();
  console.log("Loan deployed to:", await loan.getAddress());
}

main();
