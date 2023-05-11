const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, BigNumberish } = require("@ethersproject/bignumber");

const INIT_FEE_RATE = 200;
const INIT_MANAGER = "0xa293B3d8EF9F2318F7E316BF448e869e8833ec63";
const FEE_RATE_UNIT = 10000;

describe("SPex", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySPex() {
    // const LibValidator = await ethers.getContractFactory("Validator");
    // const lib = await LibValidator.deploy();
    // await lib.deployed();

    // console.log("Library Address--->" + lib.address);
    const [owner, otherAccount] = await ethers.getSigners();


    const SPex = await hre.ethers.getContractFactory("SPex", {
      libraries: {
        // Validator: lib.address,
      },
    });
    // const ERC20 = await hre.ethers.getContractFactory("FeedbackToken");
    const spex = await SPex.deploy(owner.address, INIT_FEE_RATE);

    await spex.deployed();


    return { spex, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Shold set the right manager", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);
      expect(await spex.getManager()).to.equal(owner.address);
    });

    it("Shold set the right fee rate", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);
      expect(await spex.getFeeRate()).to.equal(INIT_FEE_RATE);
    });

    it("Shold set the right fee rate unit", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);
      expect(await spex.FEE_RATE_UNIT()).to.equal(FEE_RATE_UNIT);
    });
  });

  describe("Functions", function () {
    const minerId = 1002;
    const price = 30000;
    const newPrice = 40000;

    it("test confirmTransferMinerIntoSPex", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);
      // const minerId = 1002
      // const price = 30000
      // let a = await spex.getOwnerById(minerId)
      // console.log("a.type", typeof(a), "a", a)
      expect(await spex.getOwnerById(minerId)).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      let id1 = (await spex.getListMinerById(minerId))[0].toString();
      // console.log("id.type", typeof(id), "id: ", id)
      expect(id1).to.equal(BigNumber.from("0").toString());
      timestamp = Math.floor(Date.now() / 1000);
      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );

      let id2 = (await spex.getListMinerById(minerId))[0].toString();
      expect(id2).to.equal(BigNumber.from(minerId).toString());

      // expect(await spex.getListMinerById(minerId).id).to.equal(minerId)

      let seller = (await spex.getListMinerById(minerId))[1];
      // console.log("seller", typeof(seller), "seller: ", seller)

      console.log(
        "owner.address",
        typeof owner.address,
        "owner.address: ",
        owner.address
      );
      console.log("seller: ", seller);
      expect(seller).to.equal(owner.address);

      let onlinePrice = (await spex.getListMinerById(minerId))[2].toString();
      expect(onlinePrice).to.equal(BigNumber.from(price).toString());
    });

    it("test changePrice", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );

      await spex.changePrice(minerId, newPrice);
      let onlinePrice = (await spex.getListMinerById(minerId))[2].toString();
      expect(onlinePrice).to.equal(BigNumber.from(newPrice).toString());
    });

    it("test cancelList", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );

      await spex.cancelList(minerId);
      let id1 = (await spex.getListMinerById(minerId))[0].toString();
      expect(id1).to.equal(BigNumber.from("0").toString());
    });

    it("test listMiner", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );
      await spex.cancelList(minerId);
      await spex.listMiner(minerId, price);
      let onlinePrice = (await spex.getListMinerById(minerId))[2].toString();
      expect(onlinePrice).to.equal(BigNumber.from(price).toString());
    });

    it("test buyMiner", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );

      console.log("00000000000");

      let provider = ethers.getDefaultProvider();
      console.log("111111111111111");

      // let buyerBalanceBefore = await provider.getBalance(otherAccount.address);
      // let spexBalanceBefore = await provider.getBalance(spex.address);
      // let sellerBalanceBefore = await provider.getBalance(owner.address);

      console.log("22222222222");

      let feeRate = await spex.getFeeRate();

      let onlinePrice = (await spex.getListMinerById(minerId))[2].toString();
      let seller = (await spex.getListMinerById(minerId))[1];
      expect(seller).to.equal(owner.address);

      await spex
        .connect(otherAccount)
        .buyMiner(minerId, { value: onlinePrice });

      // let buyerBalanceAfter = await provider.getBalance(otherAccount.address);
      // let spexBalanceAfter = await provider.getBalance(spex.address);
      // let sellerBalanceAfter = await provider.getBalance(owner.address);

      let transactionFee = Math.floor((onlinePrice * feeRate) / FEE_RATE_UNIT);
      console.log("transactionFee: ", transactionFee);
      let toSellerAmount = onlinePrice - transactionFee;

      // console.log("buyerBalanceBefore: ", buyerBalanceBefore, "buyerBalanceAfter: ", buyerBalanceAfter)
      // console.log("spexBalanceAfter: ", spexBalanceAfter, "spexBalanceBefore: ", spexBalanceBefore)
      // console.log("sellerBalanceAfter: ", sellerBalanceAfter, "sellerBalanceBefore: ", sellerBalanceBefore)

      // expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(onlinePrice);
      // expect(spexBalanceAfter - spexBalanceBefore).to.equal(transactionFee);
      // expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(toSellerAmount);
    });

    it("test changeFee", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );

      const newFeeRate = 500;
      await spex.changeFeeRate(newFeeRate);

      expect(await spex.getFeeRate()).to.equal(newFeeRate);
    });

    it("test changeManager", async function () {
      const { spex, owner, otherAccount } = await loadFixture(deploySPex);

      await spex.confirmTransferMinerIntoSPex(
        minerId,
        "0x12",
        timestamp,
        price
      );
      await spex.changeManager(otherAccount.address);
      expect(await spex.getManager()).to.equal(otherAccount.address);
    });
  });

});
