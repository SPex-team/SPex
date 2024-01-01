// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const LibValidator = await ethers.getContractFactory("Validator");
  const libValidator = await LibValidator.deploy();

  const LibCommon = await ethers.getContractFactory("Common");
  const libCommon = await LibCommon.deploy();

  console.log("libValidator Address--->" + libValidator.target)


  const SPex = await hre.ethers.getContractFactory("SPexBeneficiary", {
    libraries: {
      // Validator: libValidator.target,
      Common: libCommon.target
    }
  });
  const spex = await SPex.deploy("0xad252C0b07c0dCC40137E305Af5f67739AE2A656", 600000, 120000);

  console.log(
    `deployed to ${spex.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

