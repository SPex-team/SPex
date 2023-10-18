// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";
import { UD60x18, ud, uUNIT } from "@prb/math/src/UD60x18.sol";


library Common {

    struct Integer {
        uint value;
        bool neg;
    }

    function calculatePrincipleAndInterest(uint loanAmount, uint startTimestamp, uint endTimestamp, uint dayRate, uint dayRateBase) internal pure returns (uint) {
        uint loanDurationDays = (endTimestamp - startTimestamp) / 86400;    //There are 86400 seconds in one day
        //The fallowing line uses the formula <Principle> + <Interest> = <Principle> * (1 + <Daily Interest Rate>)^<Loan Duration in Days>
        return toUint(toUD60x18(dayRateBase + dayRate, dayRateBase).powu(loanDurationDays), dayRateBase) * loanAmount / dayRateBase;
    }

    function toUint(UD60x18 input, uint rateBase) private pure returns (uint) {
        return input.intoUint256() * rateBase / uUNIT;
    }

    function toUD60x18(uint input, uint rateBase) private pure returns (UD60x18){
        return ud(input * uUNIT / rateBase);
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