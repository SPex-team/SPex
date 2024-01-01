const { ethers, upgrades } = require("hardhat");

async function main() {

  const LoanGovernanceToken = await ethers.getContractFactory("LoanGovernanceToken");
  const loanGovernanceToken = await LoanGovernanceToken.deploy();

  const LibValidator = await ethers.getContractFactory("Validator");
  const libValidator = await LibValidator.deploy();

  const LibCommon = await ethers.getContractFactory("Common");
  const libCommon = await LibCommon.deploy();

  console.log("loanGovernanceToken Address--->" + loanGovernanceToken.target)
  console.log("libCommon Address--->" + libCommon.target)
  console.log("libValidator Address--->" + libValidator.target)

  // Deploying
  const SPexLoan = await ethers.getContractFactory("Loan", {
    libraries: {
      // Validator: libValidator.target,
      // Common: libCommon.target
    }
  });
  const instance = await upgrades.deployProxy(SPexLoan, [loanGovernanceToken.target], {unsafeAllowLinkedLibraries: true, unsafeAllow: ['delegatecall']});
  await instance.waitForDeployment();
  console.log('SPexLoan deployed to:',instance.target);

}

main();