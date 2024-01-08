require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/0b3989b7816f4feeae0d0cc02e3b78dd",
      accounts: [
        "e986ce96ee893e327d8ee8a921af5a4e2ddf47935af510cf13fa63b466fc5ccc"
      ],
    },
    wallaby: {
      chainId: 31415,
      url: "https://wallaby.node.glif.io/rpc/v0",
      accounts: [
      ],
    },
    hyperSpace: {
      chainId: 3141,
      url: "https://api.hyperspace.node.glif.io/rpc/v1",
      accounts: [
      ],
    },
    mainnet: {
      chainId: 314,
      url: "https://filecoin-mainnet.chainstacklabs.com/rpc/v1",
      accounts: [
      ],
    },
    calibration: {
      chainId: 314159,
      url: "https://api.calibration.node.glif.io/rpc/v1",
      accounts: [
        "e986ce96ee893e327d8ee8a921af5a4e2ddf47935af510cf13fa63b466fc5ccc"
      ],
    },
    local_net: {
      chainId: 31415926,
      url: "http://47.89.194.181:12345/rpc/v1",
      accounts: [
      ],
    },
    hardhat: {
      accounts: [
        {
          privateKey: "ec30c33546ddf1ce381e7a9be187bad34659048c182f1bd756e21d4733bd5998",
          balance: "99999900000000000000000000000000"
        }
      ]
    },
  },
  mocha: {
    timeout: 1000000
  },
};
