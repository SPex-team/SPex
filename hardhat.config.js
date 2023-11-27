require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/0b3989b7816f4feeae0d0cc02e3b78dd",
      accounts: [
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
      url: "https://filecoin-calibration.chainup.net/rpc/v1",
      accounts: [
      ],
    },
    local_net: {
      chainId: 31415926,
      url: "http://47.89.194.181:12345/rpc/v1",
      accounts: [
      ],
    }
  },
  mocha: {
    timeout: 1000000
  },
};
