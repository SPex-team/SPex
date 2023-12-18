// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/PrecompilesAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/FilAddresses.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

// import "fevmate/contracts/utils/FilAddress.sol";

import "./utils/Common.sol";
import "./utils/Validator.sol";
import "./utils/FilAddress.sol";


/// @author SPex Team
contract LoanOwner {

    uint constant public REQUIRED_QUOTA = 1e68 - 1e18;
    int64 constant public REQUIRED_EXPIRATION = type(int64).max;


    struct Loan {
        CommonTypes.FilActorId minerId;
        address lender;
        uint amount;
        uint intresteRate;
        uint startTimestamp;
        uint endTimestamp;
    }

    struct Miner {
        CommonTypes.FilActorId minerId;
        uint ExceptBorrowAmount;
        uint borrowedAmount;
        uint interestRate;
        uint minLoanTime;
        uint maxLoanTime;
    }

    function confirmTransferMinerIntoSPex(CommonTypes.FilActorId minerId) public {
        MinerTypes.GetOwnerReturn memory ownerReturn = MinerAPI.getOwner(minerId);
        // MinerTypes.GetBeneficiairyReturn memory beneficiaryReturn = MinerAPI.getBeneficiary(minerId);
        // CommonTypes.FilAddress memory beneficiary = beneficiaryReturn.active.beneficiary;
        // require(keccak256(beneficiary.data) == keccak256(ownerReturn.owner.data), "Beneficiary address should be the owner");
        // require(keccak256(benefciaryReturn.proposed.new_beneficiary.data) == keccak256(bytes("")), "Pending beneficiary is not null");
        MinerAPI.changeOwnerAddress(minerId, ownerReturn.proposed);
    }

    function transferOwnerOut(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newOwner) external {
        MinerAPI.changeOwnerAddress(minerId, newOwner);
    }

}