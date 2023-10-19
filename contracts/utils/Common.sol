// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import { UD60x18, ud, uUNIT } from "@prb/math/src/UD60x18.sol";


library Common {

    struct Integer {
        uint value;
        bool neg;
    }

    function calculatePrincipleAndInterest(uint loanAmount, uint startTimestamp, uint endTimestamp, uint annualRate, uint rateBase) public pure returns (uint) {
        uint borrowPeriod = endTimestamp - startTimestamp;
        if (borrowPeriod == 0 || loanAmount == 0) return loanAmount;
        UD60x18 x = ud(borrowPeriod * annualRate * uUNIT / (31536000 * rateBase));
        return x.exp().intoUint256() * loanAmount / uUNIT;    
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