
import { ethers } from 'hardhat';
export let spex: any;


export const initContracts = async () => {
    let [owner, account1, account2, account3] = await ethers.getSigners();

    const SpexFactory = await ethers.getContractFactory('SPEX');
    let spex = await SpexFactory.deploy();
    await spex.deployed();
  }