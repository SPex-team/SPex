// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const LibValidator = await ethers.getContractFactory("Validator");
  const lib = await LibValidator.deploy();
  await lib.deployed();

  console.log("Library Address--->" + lib.address)


  const ERC20 = await hre.ethers.getContractFactory("SPex", {
    libraries: {
      Validator: "0x10E7a66332CD2FF07fb7251C305FB4C343c95c95"
    }
  });
  const erc20 = await ERC20.deploy("0xa293B3d8EF9F2318F7E316BF448e869e8833ec63", 200);

  await erc20.deployed();

  console.log(
    `deployed to ${erc20.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

