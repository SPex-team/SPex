// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";


contract SPEX {

    event EventMinerInContract(bytes minerId, address owner);
    event EventList(bytes minerId, address seller, uint price);
    event EventCancelList(bytes minerId);
    event EventBuy(bytes minerId, address seller, uint price, address buyer);
    event EventChangePrice(bytes minerId, uint newPrice);
    event EventMinerOutContract(bytes minerId, bytes newOwner);

    struct ListMiner {
        bytes id;
        address seller;
        uint price;
        uint listTime;
    }

    mapping(bytes => address) _contractMiners;
    mapping(bytes => ListMiner) _listMiners;

    address payable _feeTo;
    address _manager;
    uint256 _feeRate;
    uint256 constant _feeRateUnit = 10000;
    bytes _contractFilecoinAddress;

    constructor(address manager, address payable feeTo, uint256 feeRate) {
        require(feeRate < _feeRateUnit, "feeRate must less _feeRateUnit");
        _manager = manager;
        _feeTo = feeTo;
        _feeRate = feeRate;
    }

    function confirmChangeOwnerToSpex(bytes memory minerId, bytes memory sign) public {
        require(_contractFilecoinAddress.length > 0, "The _contractFilecoinAddress not set");
        require(_contractMiners[minerId]==address(0), "Miner already in contract");
        AccountTypes.AuthenticateMessageParams memory params = AccountTypes.AuthenticateMessageParams({
            signature: sign,
            message: minerId
        });
        bytes memory owner = MinerAPI.getOwner(minerId).owner;
        AccountAPI.authenticateMessage(owner, params);
        MinerAPI.changeOwnerAddress(owner, _contractFilecoinAddress);
        _contractMiners[minerId] = msg.sender;
        emit EventMinerInContract(minerId, msg.sender);
    }

    function listMiner(bytes memory minerId, uint price) public {
        require(_contractMiners[minerId]==msg.sender, "You are not owner of miner");
        require(_listMiners[minerId].id.length == 0, "Miner already list");
        address owner = _contractMiners[minerId];
        ListMiner memory miner = ListMiner ({
            id: minerId,
            seller: owner,
            price: price,
            listTime: block.timestamp
        });
        _listMiners[minerId] = miner;
        emit EventList(minerId, owner, price);
    }

    function changePrice(bytes memory minerId, uint newPrice) public {
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        ListMiner memory miner = _listMiners[minerId];
        miner.price = newPrice;
        emit EventChangePrice(minerId, newPrice);
    }

    function transferOwnerOut(bytes memory minerId, bytes memory newOwner) public {
        require(_listMiners[minerId].id.length == 0, "You must cancel list first");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        MinerAPI.changeOwnerAddress(minerId, newOwner);
        emit EventMinerOutContract(minerId, newOwner);
    }

    function cancelList(bytes memory minerId) public {
        require(_listMiners[minerId].id.length > 0, "Miner not list");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        delete _listMiners[minerId];
        emit EventCancelList(minerId);
    }

    function buyMiner(bytes memory minerId) public payable {
        ListMiner memory miner = _listMiners[minerId];
        require(miner.listTime > 0, "Miner not list");
        require(msg.value==msg.value, "Amount is incorrect");
        uint256 transactionFee = miner.price * _feeRate / _feeRateUnit;
        uint256 toSellerAmount = (miner.price * (_feeRateUnit - _feeRate)) / _feeRateUnit;
        _feeTo.transfer(transactionFee);
        payable(miner.seller).transfer(toSellerAmount);
        delete _listMiners[minerId];
        emit EventBuy(minerId, miner.seller, miner.price, msg.sender);
    }

    function getOwnerById(bytes memory minerId) view public returns(address) {
        return _contractMiners[minerId];
    }

    function getListMinerById(bytes memory minerId) view public returns(ListMiner memory) {
        return _listMiners[minerId];
    }

    function setContractFilecoinAddress(bytes memory contractFilecoinAddress) public {
        require(msg.sender == _manager, "Must manager can change");
        _contractFilecoinAddress = contractFilecoinAddress;
    }

    function getContractFilecoinAddress() public view returns (bytes memory) {
        return _contractFilecoinAddress;
    }

    function changeFeeTo(address payable newFeeTo) public {
        require(msg.sender == _manager, "Must manager can change");
        _feeTo = newFeeTo;
    }

    function getFeeTo() public view returns (address) {
        return _feeTo;
    }

    function changeFeeRate(uint256 newFeeRate) public {
        require(newFeeRate < _feeRateUnit, "The feeRate must less _feeRateUnit");
        require(msg.sender == _manager, "Must manager can change");
        _feeRate = newFeeRate;
    }

    function getFeeRate() public view returns (uint256) {
        return _feeRate;
    }
}
