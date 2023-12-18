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
contract LoanBeneficiary {

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

    function pledgeBeneficiary(CommonTypes.FilActorId minerId) external {
        MinerTypes.GetBeneficiaryReturn memory beneficiaryRet = MinerAPI.getBeneficiary(minerId);
        require(Common.bigInt2Uint(beneficiaryRet.proposed.new_quota) == REQUIRED_QUOTA, "Invalid quota");
        int64 expiration = CommonTypes.ChainEpoch.unwrap(beneficiaryRet.proposed.new_expiration);
        uint64 uExpiration = uint64(expiration);
        require(expiration == REQUIRED_EXPIRATION && uExpiration > block.number, "Invalid expiration time");
        require(uint(keccak256(abi.encode(MinerAPI.getOwner(minerId).owner.data))) == 
        uint(keccak256(abi.encode(beneficiaryRet.active.beneficiary.data))), "Beneficiary is not owner");
        // change beneficiary to contract
        MinerAPI.changeBeneficiary(minerId, MinerTypes.ChangeBeneficiaryParams({
            new_beneficiary: beneficiaryRet.proposed.new_beneficiary,
            new_quota: beneficiaryRet.proposed.new_quota,
            new_expiration: beneficiaryRet.proposed.new_expiration
        }));
    }

    function releaseBeneficiary(CommonTypes.FilActorId minerId) external {
        CommonTypes.FilAddress memory minerOwner = MinerAPI.getOwner(minerId).owner;        
        MinerAPI.changeBeneficiary(
            minerId,
            MinerTypes.ChangeBeneficiaryParams({
                new_beneficiary: minerOwner,
                new_quota: CommonTypes.BigInt(hex"00", false),
                new_expiration: CommonTypes.ChainEpoch.wrap(0)
            })
        );
    }
}