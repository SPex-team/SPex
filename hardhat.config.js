require("@nomicfoundation/hardhat-toolbox")
require("hardhat-deploy")
require("hardhat-deploy-ethers")
require("./tasks")
require("dotenv").config()

const PRIVATE_KEY = process.env.PRIVATE_KEY
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.17",
    defaultNetwork: "hyperSpace",
    networks: {
        wallaby: {
            chainId: 31415,
            url: "https://wallaby.node.glif.io/rpc/v0",
            accounts: ["28f15f13b5d279a55a49c33b9ae78232827fa6a63f5e18a5d35548e31a2d56bb"],
        },
        hyperSpace: {
            chainId: 3141,
            url: "https://api.hyperspace.node.glif.io/rpc/v1",
            accounts: ["28f15f13b5d279a55a49c33b9ae78232827fa6a63f5e18a5d35548e31a2d56bb"],
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
}
