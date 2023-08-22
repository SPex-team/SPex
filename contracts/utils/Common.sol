// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";



library Common {

    struct Integer {
        uint value;
        bool neg;
    }

    function calculateInterest(uint loanAmount, uint lastTimestamp, uint dayRate, uint dayRateBase) internal view returns(uint, uint) {
        uint daySecondes = 86400;
        uint dayNumber = (block.timestamp - lastTimestamp) / daySecondes;
        uint currentLoanAmount = loanAmount;
        for (uint i=0; i < dayNumber; i++) {
            uint interest = currentLoanAmount * dayRate / dayRateBase;
            currentLoanAmount += interest;
        }
        uint totalInterest = currentLoanAmount - loanAmount;
        uint newTimestamp = lastTimestamp + (daySecondes * dayNumber);
        return (totalInterest, newTimestamp);
    }

    function bigInt2Integer(CommonTypes.BigInt memory num) internal pure returns (Integer memory result) {
        result.neg = num.neg;
        require(num.val.length <= 32, "Length exceeds");
        if (num.val.length == 0) result.value = 0;
        else result.value = uint(bytes32(num.val)) >> (8 * (32 - num.val.length));
    }

    function bigInt2Uint(CommonTypes.BigInt memory num) internal pure returns (uint) {
        Integer memory r = bigInt2Integer(num);
        require(!r.neg, "Input is negative");
        return r.value;
    }

    function uint2BigInt(uint num) internal pure returns (CommonTypes.BigInt memory) {
        return CommonTypes.BigInt({
            val: abi.encodePacked(num),
            neg: false
        });
    }

    // function checkMaxDebtAmount(CommonTypes.FilActorId minerId, uint maxDebtAmount, uint RATE_BASE) internal view {
    //     uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(minerId);
    //     uint minerBalance = FilAddress.toAddress(minerIdUint64).balance;
    //     require(maxDebtAmount <= (minerBalance * _maxDebtRate / RATE_BASE), "The maxDebtAmount exceeds the maximum dept amount of the miner");
    // }
}