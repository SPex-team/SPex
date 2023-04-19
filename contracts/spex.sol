// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/PrecompilesAPI.sol";



import "./utils/Validator.sol";


/// @title SPex is a decentralized storage provider exchange space on FVM
/// @author Mingming Tang
contract SPex {

    event EventMinerInContract(CommonTypes.FilActorId minerId, address owner);
    event EventList(CommonTypes.FilActorId minerId, address seller, uint256 price);
    event EventCancelList(CommonTypes.FilActorId minerId);
    event EventBuy(CommonTypes.FilActorId minerId, address seller, uint256 price, address buyer);
    event EventChangePrice(CommonTypes.FilActorId minerId, uint256 newPrice);
    event EventMinerOutContract(CommonTypes.FilActorId minerId, CommonTypes.FilAddress newOwner);


    struct ListMiner {
        // the Miner ID(Address)
        CommonTypes.FilActorId id;
        // the miner seller
        address seller;
        // the current price of the miner
        uint256 price;
        // the list time
        uint listTime;
    }

    mapping(CommonTypes.FilActorId => address) _contractMiners;
    mapping(CommonTypes.FilActorId => ListMiner) _listMiners;

    CommonTypes.FilActorId[] _miner_id_list;
    address payable _feeTo;
    address _manager;
    uint256 _feeRate;
    uint256 constant _feeRateUnit = 10000;
    CommonTypes.FilAddress _contractFilecoinAddress;

    constructor(address manager, address payable feeTo, uint256 feeRate) {
        require(feeRate < _feeRateUnit, "feeRate must less _feeRateUnit");
        _manager = manager;
        _feeTo = feeTo;
        _feeRate = feeRate;
    }

    /// @dev Validate if it’s the true owner of the Miner that sign. If yes, accept the Miner and transfer it into the contract and internally record that the Miner belongs to the current message sender.   
    /// @param minerId Miner ID
    /// @param sign Use the old owner adress to sign the content that the miner id already executed the Hex transformation. 
    function confirmTransferMinerIntoSPex(CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp) public {
        CommonTypes.FilAddress memory ownerBytes = MinerAPI.getOwner(minerId).owner;
        uint64 onwerUint64 = PrecompilesAPI.resolveAddress(ownerBytes);
        Validator.validateOwnerSign(sign, minerId, onwerUint64, timestamp);
        CommonTypes.FilAddress memory beneficiary = MinerAPI.getBeneficiary(minerId).active.beneficiary;
        require(keccak256(beneficiary.data) == keccak256(ownerBytes.data), "Beneficiary is not owner");
        MinerAPI.changeOwnerAddress(minerId, _contractFilecoinAddress);
        _contractMiners[minerId] = msg.sender;
        _miner_id_list.push(minerId);
        emit EventMinerInContract(minerId, msg.sender);
    }

    /// @dev Designate Miner & price and list the Miner on sale
    /// @param minerId Miner ID
    /// @param price Sale price
    function listMiner(CommonTypes.FilActorId minerId, uint256 price) public {
        require(_contractMiners[minerId]==msg.sender, "You are not owner of miner");
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "Miner already list");
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

    /// @dev Edit the price of listed Miner
    /// @param minerId Miner ID
    /// @param newPrice New sale price
    function changePrice(CommonTypes.FilActorId minerId, uint256 newPrice) public {
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "Miner not list");
        ListMiner memory miner = _listMiners[minerId];
        miner.price = newPrice;
        _listMiners[minerId] = miner;
        emit EventChangePrice(minerId, newPrice);
    }

    /// @dev Set the address that the owner want to transfer out of the contract to the outside ordinary address.
    /// @param minerId Miner ID
    /// @param newOwner New owner address
    function transferOwnerOut(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newOwner) public {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "You must cancel list first");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        MinerAPI.changeOwnerAddress(minerId, newOwner);
        delete _contractMiners[minerId];
        emit EventMinerOutContract(minerId, newOwner);
    }

    /// @dev Cancel the listed on sale Miner order
    /// @param minerId Miner ID
    function cancelList(CommonTypes.FilActorId minerId) public {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "Miner not list");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        delete _listMiners[minerId];
        emit EventCancelList(minerId);
    }

    /// @dev Buy the Miner, buyer pay for the price and target the buyer as new owner of the Miner in the contract and transfer the money to seller. 
    /// @param minerId Miner ID
    function buyMiner(CommonTypes.FilActorId minerId) public payable {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        ListMiner memory miner = _listMiners[minerId];
        require(minerIdUint64 > 0, "Miner not list");
        require(msg.value==miner.price, "Incorrent payment amount");
        uint256 transactionFee = miner.price * _feeRate / _feeRateUnit;
        uint256 toSellerAmount = (miner.price * (_feeRateUnit - _feeRate)) / _feeRateUnit;
        _feeTo.transfer(transactionFee);
        payable(miner.seller).transfer(toSellerAmount);
        delete _listMiners[minerId];
        _contractMiners[minerId] = msg.sender;
        emit EventBuy(minerId, miner.seller, miner.price, msg.sender);
    }

    /// @dev Check owner info of the Miner via Miner ID
    /// @param minerId Miner ID
    function getOwnerById(CommonTypes.FilActorId minerId) view public returns(address) {
        return _contractMiners[minerId];
    }

    /// @dev check owner info of the listed Miner via Miner ID
    /// @param minerId Miner ID
    function getListMinerById(CommonTypes.FilActorId minerId) view public returns(ListMiner memory) {
        return _listMiners[minerId];
    }

    function setContractFilecoinAddress(CommonTypes.FilAddress memory contractFilecoinAddress) public {
        require(msg.sender == _manager, "Must manager can change");
        _contractFilecoinAddress = contractFilecoinAddress;
    }

    function getContractFilecoinAddress() public view returns (CommonTypes.FilAddress memory) {
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

    function withdraw(address payable to, uint256 amount) public payable {
        require(msg.sender == _manager);
        to.transfer(amount);
    }

    function getMinerIdList() public view returns (CommonTypes.FilActorId[] memory) {
        return _miner_id_list;
    }

    function getManager() public view returns (address) {
        return _manager;
    }
}

