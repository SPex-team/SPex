// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;


contract SPEX {
    
    struct Miner {
        string id;
        address currentOwner;
        bool isOnSale;
        uint price;
        uint listTime;
        uint dealTime;
    }

    mapping(string => Miner) miners;

    function confirmChangeOwnerToSpex(string calldata minerId) public {

    }

    function listMiner(string calldata minerId, uint price) public {
        Miner memory miner = miners[minerId];
        require(miner.isOnSale == false, "Miner already in list");
        miner.isOnSale = true;
        miner.price = price;
    }

    function changePrice(string calldata minerId, uint price) public {
        Miner memory miner = miners[minerId];
        require(miner.isOnSale == true, "Miner not list yet");
        miner.price = price;
    }


    

    
}