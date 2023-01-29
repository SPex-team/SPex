// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

contract SPEX {

    struct ListMiner {
        string id;
        address seller;
        uint price;
        uint listTime;
    }

    struct HistoryRecord {
        string id;
        address seller;
        address buyer;
        uint price;
        uint dealTime;
    }

    mapping(string => address) contractMiners;

    mapping(string => ListMiner) listMiners;

    mapping (address => uint) name;

    function confirmChangeOwnerToSpex(string calldata minerId, string calldata sign) public {

    }

    function listMiner(string calldata minerId, uint price) public {
        // Miner memory miner = miners[minerId];
        // require(miner.isOnSale == false, "Miner already in list");
        // miner.isOnSale = true;
        // miner.price = price;
    }

    function changePrice(string calldata minerId, uint price) public {
        // Miner memory miner = miners[minerId];
        // require(miner.isOnSale == true, "Miner not list yet");
        // miner.price = price;
    }

    function changeOwner(string calldata minderId, string calldata newOwner) public {

    }


    function getListMiners() view public {

    }


    function getHistoryRecords() view public {

    }

    function getAvailableBalance(bytes memory target) public returns (int256) {
        MinerTypes.GetAvailableBalanceReturn memory r = MinerAPI.getAvailableBalance(target);
        return 123;
    }
}
