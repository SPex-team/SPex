import { expect } from "chai"
import hre from "hardhat"
import { time } from "@nomicfoundation/hardhat-network-helpers"

import { initContracts, spex } from "./setup"

describe("Spex", function () {
  beforeEach(async function () {
    await initContracts()
  })

  it("Should set the right _contractFilecoinAddress", async function () {
    console.log("1111111")
    const contractFilecoinAddress = "00da43"
    await spex.setContractFilecoinAddress(contractFilecoinAddress)
    // assert that the value is correct
    expect(await spex.getContractFilecoinAddress).to.equal(contractFilecoinAddress)
  });
});