import { expect } from "chai"
import hre from "hardhat"
import { time } from "@nomicfoundation/hardhat-network-helpers"

import { initContracts, spex } from "./setup"

describe("Spex", function () {
  beforeEach(async function () {
    await initContracts()
  })

  it("Should set the right _contractFilecoinAddress", async function () {
    const contractFilecoinAddress = "0x00da43"
    await spex.setContractFilecoinAddress(contractFilecoinAddress)
    // assert that the value is correct
    expect(await spex.getContractFilecoinAddress).to.equal(contractFilecoinAddress)
  });

  it("confirmChangeOwnerToSpex", async function () {
    const minerId = "0x00e807"
    await spex.getOwnerById(minerId)
    // assert that the value is correct
    // expect(await spex.getContractFilecoinAddress).to.equal(contractFilecoinAddress)
  });

});