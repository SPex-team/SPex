
const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const { ethers } = require("hardhat");
  const { BigNumber, BigNumberish } = require("@ethersproject/bignumber");
  const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');
  
  
  describe("LoanGovernor", function () {
    async function deployLoanGovernor() {
        let [deployer] = await ethers.getSigners();

        const LoanTimelockController = await ethers.getContractFactory("LoanTimelockController");
        const loanTimelockController = await LoanTimelockController.deploy(
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

        return {deployer, loanGovernanceToken, loanTimelockController, loanGovernor}
    }
  
    describe("Deployment", function () {
      it("Shold set the right fundation", async function () {
        const { deployer, loanGovernanceToken, loanTimelockController, loanGovernor } = await loadFixture(deployLoanGovernor);
        // await loanGovernanceToken.mint(deployer.address, constants.ethers)
      });
    });
  });
  