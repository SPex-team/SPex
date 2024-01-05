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
  await spexBeneficiary
    .connect(signers[1])
    .pledgeBeneficiaryToSpex(
      5678,
      "0x12",
      nowTimestamp,
      6000n * ONE_ETHER,
      80000,
      signers[14].address,
      false,
      4,
      ONE_ETHER * 100n
    );
}

describe("SPexBeneficiary", function () {
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
    const spexBeneficiary = await SPexBeneficiary.deploy();
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
      expect(await spexBeneficiary._maxDebtRate()).to.equal(400000);
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
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        await spexBeneficiary.releaseBeneficiary(10);
        await spexBeneficiary.releaseBeneficiary(200);
        await spexBeneficiary.releaseBeneficiary(234567);
        await spexBeneficiary.connect(signers[1]).releaseBeneficiary(5678);
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
      it("Interest rate not equal to expected", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(10, 140000, { value: ONE_ETHER * 1n });
        await expect(result).to.be.revertedWith(
          "Interest rate not equal to expected"
        );
      });
      it("Lending for this miner is disabled", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let nowTimestamp = Math.floor(Date.now() / 1000);
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
          .lendToMiner(19, 150000, { value: ONE_ETHER * 1n });
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
          .connect(signers[15])
          .lendToMiner(10, 150000, { value: ONE_ETHER * 1n });
        await spexBeneficiary
          .connect(signers[16])
          .lendToMiner(10, 150000, { value: ONE_ETHER * 1n });
        await spexBeneficiary
          .connect(signers[17])
          .lendToMiner(10, 150000, { value: ONE_ETHER * 1n });
        let result = spexBeneficiary
          .connect(signers[18])
          .lendToMiner(10, 150000, { value: ONE_ETHER * 1n });
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
          .lendToMiner(10, 150000, { value: BigInt(1e17) });
        await expect(result).to.be.revertedWith(
          "Lend amount smaller than minimum allowed"
        );
      });
      it("Debt rate of miner after lend larger than allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let nowTimestamp = Math.floor(Date.now() / 1000);
        await spexBeneficiary.pledgeBeneficiaryToSpex(
          19,
          "0x12",
          nowTimestamp,
          22n * ONE_ETHER,
          150000,
          signers[11].address,
          false,
          3,
          ONE_ETHER * 1n
        );
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(19, 150000, { value: ONE_ETHER * 21n });
        let mineBlockNumberHex = `0x${(1051200).toString(16)}`;
        await hre.network.provider.send("hardhat_mine", [
          mineBlockNumberHex,
          "0x1e",
        ]);
        let result = spexBeneficiary
          .connect(signers[10])
          .lendToMiner(19, 150000, { value: ONE_ETHER * 1n });
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
          .lendToMiner(10, 150000, { value: ONE_ETHER * 100n });
        await expect(result).to.be.revertedWith(
          "Debt amount after lend large than allowed by miner"
        );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(200, 120000, { value: ONE_ETHER * 2n });

        await spexBeneficiary
        .connect(signers[10])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 3n });

        await spexBeneficiary
        .connect(signers[11])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 3n });

        await spexBeneficiary
        .connect(signers[11])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });
        let loan = await spexBeneficiary._loans(signers[10].address, 200)
        await expect(loan.principalAmount).to.equal(5n * ONE_ETHER);
      });

    });

    async function sellLoanPreSteps(spexBeneficiary) {
      await pledgeSomeMiners(spexBeneficiary);
      let signers = await ethers.getSigners();
      await spexBeneficiary
        .connect(signers[10])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });

      // let lastTimestamp = (await ethers.provider.getBlock()).timestamp;
      // console.log("lastTimestamp: ", lastTimestamp);

      await spexBeneficiary
        .connect(signers[10])
        .sellLoan(200, ONE_ETHER * 3n, BigInt(95e16));
    }

    describe("sellLoan", async function () {
      it("Loan does not exist", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .sellLoan(200, ONE_ETHER * 3n, BigInt(95e16));
        await expect(result).to.be.revertedWith("Loan does not exist");
      });

      it("Sale already exists", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .sellLoan(200, ONE_ETHER * 3n, BigInt(95e16));
        await expect(result).to.be.revertedWith("Sale already exists");
      });

      it("EventSellLoan", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[10])
          .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });

        let result = spexBeneficiary
          .connect(signers[10])
          .sellLoan(200, ONE_ETHER * 30n, BigInt(95e16));

        await expect(result)
          .to.emit(spexBeneficiary, "EventSellLoan")
          .withArgs(signers[10].address, 200, ONE_ETHER * 30n, BigInt(95e16));
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await sellLoanPreSteps(spexBeneficiary);
        let miner = await spexBeneficiary.getMiner(200);
        expect(miner.lenders.length).to.equal(1);

        let sellItem = await spexBeneficiary._sales(signers[10].address, 200);
        expect(sellItem.amountRemaining).to.equal(ONE_ETHER * 3n);
        expect(sellItem.pricePerFil).to.equal(BigInt(95e16));

        // let mineBlockNumberHex = `0x${(1051200).toString(16)}`;
        // await hre.network.provider.send("hardhat_mine", [
        //   mineBlockNumberHex,
        //   "0x1e",
        // ]);

        // await spexBeneficiary
        //   .connect(signers[11])
        //   .buyLoan(signers[10].address, ONE_ETHER * 3n, BigInt(95e16));

        // miner = await spexBeneficiary.getMiner(200);
        // expect(miner.lenders.length).to.equal(2);

        // await spexBeneficiary
        //   .connect(signers[12])
        //   .sellLoan(200, ONE_ETHER * 30n, BigInt(95e16));
        // miner = await spexBeneficiary.getMiner(200);
        // expect(miner.lenders.length).to.equal(0);
        // await expect(result).to.be.revertedWith("Sale already exists");
      });
    });

    describe("modifyLoanSale", async function () {
      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[10])
          .modifyLoanSale(200, ONE_ETHER * 4n, BigInt(92e16));
        let sellItem = await spexBeneficiary._sales(signers[10].address, 200);
        expect(sellItem.amountRemaining).to.equal(ONE_ETHER * 4n);
        expect(sellItem.pricePerFil).to.equal(BigInt(92e16));
      });
    });

    describe("cancelLoanSale", async function () {
      it("EventCancelSellLoan", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary.connect(signers[10]).cancelLoanSale(200);

        await expect(result)
          .to.emit(spexBeneficiary, "EventCancelSellLoan")
          .withArgs(signers[10].address, 200);
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary.connect(signers[10]).cancelLoanSale(200);
        let sellItem = await spexBeneficiary._sales(signers[10].address, 200);
        expect(sellItem.amountRemaining).to.equal(ONE_ETHER * 0n);
        expect(sellItem.pricePerFil).to.equal(BigInt(0));
      });
    });

    describe("buyLoan", async function () {
      it("buyAmount too small", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 1n, BigInt(95e16), {
            value: BigInt(95e16),
          });
        await expect(result).to.be.revertedWith(
          "buyAmount too small"
        );
      });

      it("Price not equal to expected", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(96e16), {
            value: BigInt(19e17),
          });
        await expect(result).to.be.revertedWith("Price not equal to expected");
        result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(9e16), {
            value: BigInt(19e17),
          });
        await expect(result).to.be.revertedWith("Price not equal to expected");
      });

      it("buyAmount larger than amount on sale", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 4n, BigInt(95e16), {
            value: BigInt(38e17),
          });
        await expect(result).to.be.revertedWith(
          "buyAmount larger than amount on sale"
        );
      });

      it("Paid amount not equal to sale price", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(17e17),
          });
        await expect(result).to.be.revertedWith(
          "Paid amount not equal to sale price"
        );
        result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(20e17),
          });
        await expect(result).to.be.revertedWith(
          "Paid amount not equal to sale price"
        );
      });

      it("Insufficient owed amount", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary.directRepayment(signers[10].address, 200, {
          value: 4n * ONE_ETHER,
        });
        let result = spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(19e17),
          });
        await expect(result).to.be.revertedWith("Insufficient owed amount");
      });

      it("Lenders list too long", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[11])
          .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });
        await spexBeneficiary
          .connect(signers[12])
          .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });
        await spexBeneficiary
          .connect(signers[13])
          .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });

        let result = spexBeneficiary
          .connect(signers[14])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(19e17),
          });
        await expect(result).to.be.revertedWith("Lenders list too long");
      });

      it("EventBuyLoan", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        let mineBlockNumberHex = `0x${(1051200).toString(16)}`;
        await hre.network.provider.send("hardhat_mine", [
          mineBlockNumberHex,
          "0x1e",
        ]);
        await spexBeneficiary._updateLenderOwedAmount(signers[10].address, 200);
        let loan = await spexBeneficiary._loans(signers[10].address, 200);
        console.log("loan: ", loan);

        // let lastTimestamp = (await ethers.provider.getBlock()).timestamp;
        // console.log("lastTimestamp: ", lastTimestamp);

        let result = spexBeneficiary
          .connect(signers[14])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(19e17),
          });
        await expect(result)
          .to.emit(spexBeneficiary, "EventBuyLoan")
          .withArgs(
            signers[14].address,
            signers[10].address,
            200,
            ONE_ETHER * 2n,
            BigInt(95e16),
            1773841048928474057n
          );
      });

      it("Normal Test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, ONE_ETHER * 2n, BigInt(95e16), {
            value: BigInt(19e17),
          });

        let sellItem = await spexBeneficiary._sales(signers[10].address, 200);
        expect(sellItem.amountRemaining).to.equal(ONE_ETHER * 1n);
        expect(sellItem.pricePerFil).to.equal(BigInt(95e16));

        sellItem = await spexBeneficiary._sales(signers[15].address, 200);
        expect(sellItem.amountRemaining).to.equal(ONE_ETHER * 0n);
        expect(sellItem.pricePerFil).to.equal(BigInt(0));
        let lastTimestamp = (await ethers.provider.getBlock()).timestamp;
        let loan = await spexBeneficiary._loans(signers[15].address, 200);
        expect(loan.lastAmount).to.equal(ONE_ETHER * 2n);
        expect(loan.lastUpdateTime).to.equal(lastTimestamp);

        let miner = await spexBeneficiary.getMiner(200);
        expect(miner.lenders.length).to.equal(2);

        await spexBeneficiary
          .connect(signers[15])
          .buyLoan(signers[10].address, 200, 10000n, BigInt(95e16), {
            value: BigInt(9500n),
          });
      });
    });

    describe("getCurrentMinerOwedAmount", async function () {
      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await pledgeSomeMiners(spexBeneficiary);
        await spexBeneficiary
        .connect(signers[10])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 5n });
        await spexBeneficiary
        .connect(signers[11])
        .lendToMiner(200, 120000, { value: ONE_ETHER * 12n });
        let res10 = await spexBeneficiary.getCurrentMinerOwedAmount(10)
        expect(res10[0]).to.equal(0n)
        expect(res10[1]).to.equal(0n)
        let res200 = await spexBeneficiary.getCurrentMinerOwedAmount(200)
        expect(res200[0]).to.equal(17n * ONE_ETHER + 19025875225n)
        expect(res200[1]).to.equal(17n * ONE_ETHER)
      });

    //   it("xxxxxxxxxxx", async function () {
    //     const { spexBeneficiary, owner, otherAccount } = await loadFixture(
    //       deploySPexBeneficiary
    //     );
    //     await pledgeSomeMiners(spexBeneficiary);
    //     let signers = await ethers.getSigners();
    //     let result = spexBeneficiary
    //       .connect(signers[10])
    //       .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
    //     await expect(result).to.be.revertedWith("xxxxxxxxxx");
    //   });
    });

    describe("getCurrentLenderOwedAmount", async function () {
      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await sellLoanPreSteps(spexBeneficiary)
        let signers = await ethers.getSigners();
        let res10 = await spexBeneficiary.getCurrentLenderOwedAmount(signers[10].address, 200)
        expect(res10[0]).to.equal(5n * ONE_ETHER + 19025875225n)
        expect(res10[1]).to.equal(5n * ONE_ETHER)
      });
      //   const { spexBeneficiary, owner, otherAccount } = await loadFixture(
      //     deploySPexBeneficiary
      //   );
      //   await pledgeSomeMiners(spexBeneficiary);
      //   let signers = await ethers.getSigners();
      //   let result = spexBeneficiary
      //     .connect(signers[10])
      //     .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
      //   await expect(result).to.be.revertedWith("xxxxxxxxxx");
      // });
    });

    describe("changeFoundation", async function () {
      it("Only foundation allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeFoundation(signers[11].address);
        await expect(result).to.be.revertedWith("Only foundation allowed");
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary
          .changeFoundation(signers[11].address);
        let result = await spexBeneficiary
        ._foundation()
        expect(result).to.equal(signers[11].address);
      });
    });

    describe("changeMaxDebtRate", async function () {
      it("Only foundation allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeMaxDebtRate(300000);
        await expect(result).to.be.revertedWith("Only foundation allowed");
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        await spexBeneficiary.changeMaxDebtRate(300000);
        let result = await spexBeneficiary
        ._maxDebtRate()
        expect(result).to.equal(300000);
      });
    });

    describe("changeFeeRate", async function () {
      it("Only foundation allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .changeFeeRate(150000);
        await expect(result).to.be.revertedWith("Only foundation allowed");
      });

      it("Fee rate must less than or equal to MAX_FEE_RATE", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        await pledgeSomeMiners(spexBeneficiary);
        let signers = await ethers.getSigners();
        let result = spexBeneficiary.changeFeeRate(700000);
        await expect(result).to.be.revertedWith("Fee rate must less than or equal to MAX_FEE_RATE");
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await spexBeneficiary.changeFeeRate(150000);
        let result = await spexBeneficiary._feeRate()
        expect(result).to.equal(150000);
      });
    });

    describe("withdraw", async function () {
      it("Only foundation allowed", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        let result = spexBeneficiary
          .connect(signers[10])
          .withdraw(signers[15].address, 1234567890n);
        await expect(result).to.be.revertedWith("Only foundation allowed");
      });

      it("Normal test", async function () {
        const { spexBeneficiary, owner, otherAccount } = await loadFixture(
          deploySPexBeneficiary
        );
        let signers = await ethers.getSigners();
        await sellLoanPreSteps(spexBeneficiary)
        let mineBlockNumberHex = `0x${(1051200).toString(16)}`;
        await hre.network.provider.send("hardhat_mine", [
          mineBlockNumberHex,
          "0x1e",
        ]);
        await spexBeneficiary.directRepayment(signers[10].address, 200, {
          value: 11n * ONE_ETHER,
        });
        let balanceBefore = await ethers.provider.getBalance(signers[15].address);
        console.log("typeof balanceBefore: ", typeof balanceBefore)
        await spexBeneficiary.withdraw(signers[15].address, 1234567890n);
        let balanceAfter = await ethers.provider.getBalance(signers[15].address);
        await expect(balanceAfter).to.equal(balanceBefore + 1234567890n);
      });
    });

    // describe("xxxxxx", async function () {
    //   it("xxxxxxxxxxx", async function () {
    //     const { spexBeneficiary, owner, otherAccount } = await loadFixture(
    //       deploySPexBeneficiary
    //     );
    //     await pledgeSomeMiners(spexBeneficiary);
    //     let signers = await ethers.getSigners();
    //     let result = spexBeneficiary
    //       .connect(signers[10])
    //       .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
    //     await expect(result).to.be.revertedWith("xxxxxxxxxx");
    //   });

    //   it("xxxxxxxxxxx", async function () {
    //     const { spexBeneficiary, owner, otherAccount } = await loadFixture(
    //       deploySPexBeneficiary
    //     );
    //     await pledgeSomeMiners(spexBeneficiary);
    //     let signers = await ethers.getSigners();
    //     let result = spexBeneficiary
    //       .connect(signers[10])
    //       .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
    //     await expect(result).to.be.revertedWith("xxxxxxxxxx");
    //   });
    // });

    // describe("xxxxxx", async function () {
    //   it("xxxxxxxxxxx", async function () {
    //     const { spexBeneficiary, owner, otherAccount } = await loadFixture(
    //       deploySPexBeneficiary
    //     );
    //     await pledgeSomeMiners(spexBeneficiary);
    //     let signers = await ethers.getSigners();
    //     let result = spexBeneficiary
    //       .connect(signers[10])
    //       .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
    //     await expect(result).to.be.revertedWith("xxxxxxxxxx");
    //   });

    //   it("xxxxxxxxxxx", async function () {
    //     const { spexBeneficiary, owner, otherAccount } = await loadFixture(
    //       deploySPexBeneficiary
    //     );
    //     await pledgeSomeMiners(spexBeneficiary);
    //     let signers = await ethers.getSigners();
    //     let result = spexBeneficiary
    //       .connect(signers[10])
    //       .xxxxxxxxxx(10, 140000, { value: ONE_ETHER * 1n });
    //     await expect(result).to.be.revertedWith("xxxxxxxxxx");
    //   });
    // });
  });
});
