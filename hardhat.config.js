require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/0b3989b7816f4feeae0d0cc02e3b78dd",
      accounts: [
        "28f15f13b5d279a55a49c33b9ae78232827fa6a63f5e18a5d35548e31a2d56bb",
      ],
    },
    wallaby: {
      chainId: 31415,
      url: "https://wallaby.node.glif.io/rpc/v0",
      accounts: [
        "28f15f13b5d279a55a49c33b9ae78232827fa6a63f5e18a5d35548e31a2d56bb",
      ],
    },
    hyperSpace: {
      chainId: 3141,
      url: "https://api.hyperspace.node.glif.io/rpc/v1",
      accounts: [
        "43ba13d5b141082e8c2e22bc41c84d234b5dd2ff3b6e66b89757f96a33840e40",
      ],
    },
    mainnet: {
      chainId: 314,
      url: "https://filecoin-mainnet.chainstacklabs.com/rpc/v1",
      accounts: [
        "ec30c33546ddf1ce381e7a9be187bad34659048c182f1bd756e21d4733bd5998",
      ],
    },
  },
  mocha: {
    timeout: 1000000
  },
};
