const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, BigNumberish } = require("@ethersproject/bignumber");
const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const INIT_FEE_RATE = 100;
const INIT_MANAGER = "0xa293B3d8EF9F2318F7E316BF448e869e8833ec63";
const FEE_RATE_TOTAL = 10000;
const MAX_COMMISSION = 500e18;
const RATE_BASE = 1000000;
const FEE_RATE = 50000;
const INIT_MAX_DEBT_RATE = 400000;

const ONE_ETHER = BigInt(1e18);
const MINI_LEND_AMOUNT = ONE_ETHER * 2n;

// const SPex = artifacts.require('SPex');

async function pledgeSomeMiners(spexBeneficiary) {
  let nowTimestamp = Math.floor(Date.now() / 1000);
  let signers = await ethers.getSigners();
  await spexBeneficiary.pledgeBeneficiaryToSpex(
    10,
    "0x12",
    nowTimestamp,
    4n * ONE_ETHER,
    150000,
    signers[11].address,
    false,
    3,
    ONE_ETHER * 1n
  );
  await spexBeneficiary.pledgeBeneficiaryToSpex(
    200,
    "0x12",
    nowTimestamp,
    80n * ONE_ETHER,
    120000,
    signers[12].address,
    false,
    4,
    ONE_ETHER * 2n
  );
  await spexBeneficiary.pledgeBeneficiaryToSpex(
    234567,
    "0x12",
    nowTimestamp,
    4000n * ONE_ETHER,
    70000,
    signers[13].address,
    false,
    4,
    ONE_ETHER * 10n
  );
}

describe("SPexBeneficiary", function () {
  console.log("ethers.constants.ethers: ", ethers.constants);

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploySPexBeneficiary() {
    // const LibValidator = await ethers.getContractFactory("Validator");
    // const lib = await LibValidator.deploy();
    // await lib.deployed();

    const LibCommon = await ethers.getContractFactory("Common");
    const libCommon = await LibCommon.deploy();

    const [owner, otherAccount] = await ethers.getSigners();
    const SPexBeneficiary = await hre.ethers.getContractFactory(
      "SPexBeneficiary",
      {
        libraries: {
          Common: libCommon.target,
        },
      }
    );
    // const ERC20 = await hre.ethers.getContractFactory("FeedbackToken");
    const spexBeneficiary = await SPexBeneficiary.deploy(
      owner.address,
      INIT_MAX_DEBT_RATE,
      FEE_RATE,
      MINI_LEND_AMOUNT
    );
    return { spexBeneficiary, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Shold set the right foundation", async function () {
      const { spexBeneficiary, owner, otherAccount } = await loadFixture(
        deploySPexBeneficiary
      );
      expect(await spexBeneficiary._foundation()).to.equal(owner.address);
    });

    it("Shold set the right fee maxdDebtRate", async function () {
      const { spexBeneficiary, owner, otherAccount } = await loadFixture(
        deploySPexBeneficiary
      );
      expect(await spexBeneficiary._maxDebtRate()).to.equal(INIT_MAX_DEBT_RATE);
    });
  });

  describe("Functions tests", function () {
    describe("pledgeBeneficiaryToSpex", async function () {
      it("The miner is already in SPex", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);

        let nowTimestamp = Math.floor(Date.now() / 1000);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary.pledgeBeneficiaryToSpex(
          10,
          "0x12",
          nowTimestamp,
          4n * ONE_ETHER,
          150000,
          signers[11].address,
          false,
          3,
          ONE_ETHER * 1n
        );
        await expect(result).to.be.revertedWith("The miner is already in SPex");
      });

      it("maxDebtAmount amount smaller than minLendAmount", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let nowTimestamp = Math.floor(Date.now() / 1000);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary.pledgeBeneficiaryToSpex(
          10,
          "0x12",
          nowTimestamp,
          4n * ONE_ETHER,
          150000,
          signers[11].address,
          false,
          3,
          ONE_ETHER * 5n
        );
        await expect(result).to.be.revertedWith(
          "maxDebtAmount amount smaller than minLendAmount"
        );
      });

      it("Specified max debt amount exceeds max allowed by miner balance", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let nowTimestamp = Math.floor(Date.now() / 1000);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary.pledgeBeneficiaryToSpex(
          10,
          "0x12",
          nowTimestamp,
          20n * ONE_ETHER,
          150000,
          signers[11].address,
          false,
          3,
          ONE_ETHER * 5n
        );
        await expect(result).to.be.revertedWith(
          "Specified max debt amount exceeds max allowed by miner balance"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        spexBeneficiary.releaseBeneficiary(10);
        spexBeneficiary.releaseBeneficiary(200);
        spexBeneficiary.releaseBeneficiary(234567);
        await pledgeSomeMiners(spexBeneficiary);
      });
    });

    describe("releaseBeneficiary", async function () {
      it("Debt not fully paid off", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        await spexBeneficiary.lendToMiner(10, 150000, {
          value: 3n * ONE_ETHER,
        });
        let result = spexBeneficiary.releaseBeneficiary(10);
        await expect(result).to.be.revertedWith("Debt not fully paid off");
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        await spexBeneficiary
          .connect(signers[5])
          .lendToMiner(10, 150000, { value: 3n * ONE_ETHER });
        await spexBeneficiary.directRepayment(signers[5], 10, {
          value: 11n * ONE_ETHER,
        });
        await spexBeneficiary.releaseBeneficiary(10);
        let miner = await spexBeneficiary.getMiner(10);
        console.log("typeof miner.minerId: ", typeof miner.minerId);
        expect(miner.minerId).to.equal(0);
        expect(miner.lenders.length).to.equal(0);
      });
    });

    describe("changeMinerDelegator", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        let result = spexBeneficiary
          .connect(signers[14])
          .changeMinerDelegator(10, signers[10]);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        let result = await spexBeneficiary
          .connect(signers[0])
          .changeMinerDelegator(10, signers[10]);
        let miner = await spexBeneficiary.getMiner(10);
        expect(miner.delegator).to.equal(signers[10].address);
      });
    });

    describe("changeMinerMaxDebtAmount", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerMaxDebtAmount(10, 30n * ONE_ETHER);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Specified max debt amount exceeds max allowed by miner balance", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let result = spexBeneficiary.changeMinerMaxDebtAmount(
          10,
          30n * ONE_ETHER
        );
        await expect(result).to.be.revertedWith(
          "Specified max debt amount exceeds max allowed by miner balance"
        );
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[5])
          .lendToMiner(10, 150000, { value: 3n * ONE_ETHER });
        await spexBeneficiary.changeMinerMaxDebtAmount(200, 12n * ONE_ETHER);
        await spexBeneficiary.changeMinerMaxDebtAmount(
          234567,
          124n * ONE_ETHER
        );
      });
    });

    describe("changeMinerLoanInterestRate", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerLoanInterestRate(10, 30n * ONE_ETHER);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Debt not fully paid off", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[5])
          .lendToMiner(10, 150000, { value: 3n * ONE_ETHER });
        let result = spexBeneficiary.changeMinerLoanInterestRate(10, 250000);

        await expect(result).to.be.revertedWith("Debt not fully paid off");
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[5])
          .lendToMiner(10, 150000, { value: 3n * ONE_ETHER });
        await spexBeneficiary
          .connect(signers[0])
          .directRepayment(signers[5], 10, {
            value: 11n * ONE_ETHER,
          });
        await spexBeneficiary.changeMinerLoanInterestRate(10, 250000);
      });
    });

    describe("changeMinerReceiveAddress", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let newReceiveAddress = signers[10].address;
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerReceiveAddress(10, newReceiveAddress);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let newReceiveAddress = signers[10].address;
        await spexBeneficiary.changeMinerReceiveAddress(10, newReceiveAddress);
        let result = await spexBeneficiary._miners(10);
        expect(result.receiveAddress).to.equal(newReceiveAddress);
      });
    });

    describe("changeMinerDisabled", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerDisabled(10, true);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        // let newDelegatorAddress = signers[10].address;
        await spexBeneficiary.changeMinerDisabled(10, true);
        let result = await spexBeneficiary._miners(10);
        expect(result.disabled).to.equal(true);

        await spexBeneficiary.changeMinerDisabled(200, false);
        let result1 = await spexBeneficiary._miners(200);
        expect(result1.disabled).to.equal(false);

        let result2 = await spexBeneficiary._miners(234567);
        expect(result2.disabled).to.equal(false);
      });
    });

    describe("changeMinerMaxLenderCount", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerMaxDebtAmount(10, 30n * ONE_ETHER);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let newDelegatorAddress = signers[10].address;
        await spexBeneficiary.changeMinerMaxLenderCount(10, 50);
        let result = await spexBeneficiary._miners(10);
        expect(result.maxLenderCount).to.equal(50);

        await spexBeneficiary.changeMinerMaxLenderCount(200, 43);
        let result1 = await spexBeneficiary._miners(200);
        expect(result1.maxLenderCount).to.equal(43);

        let result2 = await spexBeneficiary._miners(234567);
        expect(result2.maxLenderCount).to.equal(4);
      });
    });

    describe("changeMinerBorrowParameters", async function () {
      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMinerBorrowParameters(
            10,
            signers[10].address,
            ONE_ETHER * 5n,
            190000,
            signers[18].address,
            true,
            31,
            ONE_ETHER * 2n
          );
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let newDelegatorAddress = signers[10].address;
        await spexBeneficiary.changeMinerBorrowParameters(
          10,
          newDelegatorAddress,
          ONE_ETHER * 5n,
          190000,
          signers[18].address,
          true,
          31,
          ONE_ETHER * 2n
        );
        let result = await spexBeneficiary._miners(10);
        expect(result.delegator).to.equal(newDelegatorAddress);
        expect(result.maxDebtAmount).to.equal(ONE_ETHER * 5n);
        expect(result.loanInterestRate).to.equal(190000);
        expect(result.receiveAddress).to.equal(signers[18].address);
        expect(result.disabled).to.equal(true);
        expect(result.maxLenderCount).to.equal(31);
        expect(result.minLendAmount).to.equal(ONE_ETHER * 2n);

        // await spexBeneficiary.changeMinerMaxLenderCount(200, 43);
        // let result1 = spexBeneficiary._miners(200);
        // await expect(result1.maxLenderCount).to.equal(43);

        // let result2 = spexBeneficiary._miners(234567);
        // await expect(result2.maxLenderCount).to.equal(4);
      });
    });

    describe("lendToMiner", async function () {
      it("Interest rate lower than expected", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 1, 140000);
        await expect(result).to.be.revertedWith(
          "Interest rate lower than expected"
        );
      });
      it("Lending for this miner is disabled", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await spexBeneficiary.pledgeBeneficiaryToSpex(
          19,
          "0x12",
          nowTimestamp,
          4n * ONE_ETHER,
          150000,
          signers[11].address,
          true,
          3,
          ONE_ETHER * 1n
        );
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(19, ONE_ETHER * 1, 150000);
        await expect(result).to.be.revertedWith(
          "Lending for this miner is disabled"
        );
      });

      it("Lenders list too long", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 2, 150000);
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 2, 150000);
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 2, 150000);
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 2, 150000);
        await expect(result).to.be.revertedWith("Lenders list too long");
      });

      it("Lend amount smaller than minimum allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, BigInt(1e17), 150000);
        await expect(result).to.be.revertedWith(
          "Lend amount smaller than minimum allowed"
        );
      });
      it("Debt rate of miner after lend larger than allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await spexBeneficiary.pledgeBeneficiaryToSpex(
          19,
          "0x12",
          nowTimestamp,
          22n * ONE_ETHER,
          150000,
          signers[11].address,
          true,
          3,
          ONE_ETHER * 1n
        );
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(19, ONE_ETHER * 21, 150000);
        let mineBlockNumberHex = `0x${(1051200).toString(16)}`;
        await hre.network.provider.send("hardhat_mine", [
          mineBlockNumberHex,
          "0x1e",
        ]);
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(19, ONE_ETHER * 1, 150000);
        await expect(result).to.be.revertedWith(
          "Debt rate of miner after lend larger than allowed"
        );
      });

      it("Debt amount after lend large than allowed by miner", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, ONE_ETHER * 100, 150000);
        await expect(result).to.be.revertedWith(
          "Debt amount after lend large than allowed by miner"
        );
      });
    });


    describe("sellLoan", async function () {

      it("Only miner's delegator allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        let result = spexBeneficiary
          .connect(signers[14])
          .sellLoan(10, signers[10]);
        await expect(result).to.be.revertedWith(
          "Only miner's delegator allowed"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

    describe("xxxxxxxxxx", async function () {
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
      it("xxxxxx", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .xxxxxxx();
        await expect(result).to.be.revertedWith(
          "xxxxxx"
        );
      });
    });

  });
});
