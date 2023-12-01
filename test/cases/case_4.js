const ONE_ETHER = BigInt(1e18);
const RATE_BASE = 1000000n;
const BORROW_FEE_RATE = 10000n;
const REDEEM_FEE_RATE = 5000n;

const ACCOUNT_INIT_BALANCE = 100000000000000000000000000000n;
const HARDHAT_INIT_BLOCK_NUMBER = 1000
const HARDHAT_INIT_TIMESTAMP = 5000000000

let CASE = {
  name: "",
  stepList: [
    {
      increaseBlockNumber: 3,
      contractName: "spexBeneficiary",
      functionName: "pledgeBeneficiaryToSpex",
      params: [
        10323231,
        "0x23",
        423,
        100n * ONE_ETHER,
        100000,
        "__signer10",
        false,
        50,
        ONE_ETHER * 1n,
      ],
      value: BigInt(0),
      signerIndex: 1,
    },
    {
      increaseBlockNumber: 343,
      contractName: "spexBeneficiary",
      functionName: "pledgeBeneficiaryToSpex",
      params: [
        1039992,
        "0x23",
        423,
        20000n * ONE_ETHER,
        120000,
        "__signer11",
        false,
        10,
        ONE_ETHER * 1n,
      ],
      value: BigInt(0),
      signerIndex: 2,
    },
    {
      increaseBlockNumber: 3434,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(10n * ONE_ETHER),
      signerIndex: 3,
    },
    {
      increaseBlockNumber: 43812,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(20n * ONE_ETHER),
      signerIndex: 4,
    },
    {
      increaseBlockNumber: 432,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(1n * ONE_ETHER),
      signerIndex: 5,
    },
    {
      increaseBlockNumber: 432,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(1n * ONE_ETHER),
      signerIndex: 6,
    },
    {
      increaseBlockNumber: 432,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(1n * ONE_ETHER),
      signerIndex: 7,
    },
    {
      increaseBlockNumber: 432,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(1n * ONE_ETHER),
      signerIndex: 8,
    },
    {
      increaseBlockNumber: 432,
      contractName: "spexBeneficiary",
      functionName: "lendToMiner",
      params: [10323231, 100000],
      value: BigInt(1n * ONE_ETHER),
      signerIndex: 9,
    },
  ],
  finalStateCheckList: [
  ],
  finalBalanceCheckList: [
  ],
};

let lenders = []
let miners = []
let amountList = []


for (let i=10; i< 30; i++) {
    CASE.stepList.push(
        {
            increaseBlockNumber: 432,
            contractName: "spexBeneficiary",
            functionName: "lendToMiner",
            params: [10323231, 100000],
            value: BigInt(1n * ONE_ETHER),
            signerIndex: i,
          }
    )
    lenders.push(`__signer${i}`)
    miners.push(10323231)
    amountList.push(ONE_ETHER)
}


CASE.stepList.push(
    {
        increaseBlockNumber: 184923,
        contractName: "spexBeneficiary",
        functionName: "directRepayment",
        params: ["__signer10", 10323231],
        value: BigInt(1n * ONE_ETHER),
        signerIndex: 1,
      },
      {
        increaseBlockNumber: 184923,
        contractName: "spexBeneficiary",
        functionName: "batchDirectRepayment",
        params: [lenders, miners, amountList],
        value: BigInt(ONE_ETHER * BigInt(lenders.length)),
        signerIndex: 1,
      },
)
module.exports.CASE = CASE;
