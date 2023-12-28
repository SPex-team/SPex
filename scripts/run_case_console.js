const hre = require("hardhat");
const run_case = require("./run_cases/case_5");


async function deployContracts() {
  const [owner] = await ethers.getSigners();

  const LibCommon = await ethers.getContractFactory("Common");
  const libCommon = await LibCommon.deploy();

  const LibValidator = await ethers.getContractFactory("Validator");
  const libValidator = await LibValidator.deploy();

  console.log("libCommon.target: ", libCommon.target);
  console.log("libValidator.target: ", libValidator.target);

  const SPexBeneficiary = await hre.ethers.getContractFactory(
    "SPexBeneficiary",
    {
      libraries: {
        Common: libCommon.target,
      },
    }
  );
  const spexBeneficiary = await SPexBeneficiary.deploy(
    // owner.address,
    // 600000,
    // 100000,
  );

  return { spexBeneficiary };
}

function getProcessedParams(params, signers) {
  if (Array.isArray(params)) {
    let newParams = [];
    for (let item of params) {
      if (Array.isArray(item) || typeof item == "object") {
        newChildren = getProcessedParams(item, signers);
        newParams.push(newChildren);
        continue;
      } else if (typeof item === "string") {
        if (item.startsWith("__signer")) {
          signerIndex = Number(item.split("__signer")[1]);
          signer = signers[signerIndex];
          newParams.push(signer.address);
          continue;
        }
      }
      newParams.push(item);
    }
    return newParams;
  }
  if (typeof params == "object") {
    let newParams = {};
    for (key in params) {
      value = params[key];
      if (typeof value === "string" && value.startsWith("__signer")) {
        signerIndex = Number(value.split("__signer")[1]);
        signer = signers[signerIndex];
        newParams[key] = signer.address;
        continue;
      } else if (typeof value == "object") {
        r = getProcessedParams(value, signers);
        newParams[key] = r;

        continue;
      }
      newParams[key] = value;
    }
    return newParams;
  }

  if (typeof params === "string" && params.startsWith("__signer")) {
    signerIndex = Number(value.split("__signer")[1]);
    signer = signers[signerIndex];
    return signer.address;
  }
  return params;
}

async function main() {
  const contracts = await deployContracts();
  let stepList = run_case.CASE.stepList;
  let signers = await ethers.getSigners();
  // console.log("signers.length: ", signers.length)
  // let blockNumber = await ethers.provider.getBlockNumber();
  // let lastTimestamp = 5000000000 - (1000 - blockNumber) + 1;

  let lastTimestamp = (await ethers.provider.getBlock()).timestamp;
  console.log("lastTimestamp: ", lastTimestamp)

  for (stepIndex in stepList) {
    step = stepList[stepIndex];
    console.log(
      `stepIndex: ${stepIndex} step.contractName: ${step.contractName} step.functionName: ${step.functionName} signerIndex: ${step.signerIndex}`
    );

    if (step.mineBlockNumber < 2) {
      throw "step.mineBlockNumber < 2";
    }
    mineBlockNumberHex = `0x${(step.increaseBlockNumber - 2).toString(16)}`;
    await hre.network.provider.send("hardhat_mine", [
      mineBlockNumberHex,
      "0x1",
    ]);

    lastTimestamp += step.increaseBlockNumber * 30;
    await hre.network.provider.send("evm_setNextBlockTimestamp", [
      `0x${lastTimestamp.toString(16)}`,
    ]);

    let contract = contracts[step.contractName];
    let signer = signers[step.signerIndex];
    let newParams = getProcessedParams(step.params, signers);

    let tx = await contract
      .connect(signer)
      [step.functionName](...newParams, { value: step.value });
    let result = await tx.wait();

    let block = await ethers.provider.getBlock();
    let blockTmestamp = (await ethers.provider.getBlock()).timestamp;
    console.log(
      "block.number: ",
      block.number,
      "blockTmestamp: ",
      blockTmestamp,
      "result.cumulativeGasUsed: ",
      result.cumulativeGasUsed
    );

    sendTransaction = {
      to: signer.address,
      value: result.cumulativeGasUsed * result.gasPrice,
    };
    await signers[0].sendTransaction(sendTransaction);
    return contracts

  }
}


// let contracts = await main()

module.exports.main = main;
