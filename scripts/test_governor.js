const { ethers, upgrades } = require("hardhat");
const {parseEther} = require("ethers")
const hre = require("hardhat")

async function main() {

    let [owner, secondSinger] = await ethers.getSigners()
    const LoanGovernanceToken = await ethers.getContractFactory("LoanGovernanceToken");
    const loanGovernanceToken = await LoanGovernanceToken.deploy()

    const LoanGovernor = await ethers.getContractFactory("LoanGovernor");
    const loanGovernor = await LoanGovernor.deploy(loanGovernanceToken.target)

    await loanGovernanceToken.mint(owner.address, parseEther("1000000"))
    await loanGovernanceToken.mint(loanGovernor.target, parseEther("2000000"))

    const transferCalldata = loanGovernanceToken.interface.encodeFunctionData("transfer", [secondSinger.address, parseEther("10")])
    console.log(
        [loanGovernanceToken.target],
        [0],
        [transferCalldata],
        "lalala")
    await loanGovernor.propose(
        [loanGovernanceToken.target],
        [0],
        [transferCalldata],
        "Proposal #1: Give grant to team"
    )

    await hre.network.provider.send("hardhat_mine", [
        mineBlockNumberHex,
        "0x1e",
      ]);
    
}

main();
