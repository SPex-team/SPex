// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/PrecompilesAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/FilAddresses.sol";


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
        address buyer;
        // the current price of the miner
        uint256 price;
        // the list time
        uint listTime;
    }

    mapping(CommonTypes.FilActorId => address) _contractMiners;
    mapping(CommonTypes.FilActorId => ListMiner) _listMiners;
    mapping(address => uint256) public _lastTimestampMap;

    CommonTypes.FilActorId[] _minerIdList;

    address _manager;
    uint256 _feeRate;
    uint256 constant public FEE_RATE_UNIT = 10000;

    modifier onlyManager {
        require(msg.sender == _manager, "You are not the manager");
        _;
    }

    modifier onlyMinerOwner(CommonTypes.FilActorId minerId) {
        require(_contractMiners[minerId]==msg.sender, "You are not owner of miner");
        _;
    }

    constructor(address manager, uint256 feeRate) {
        require(feeRate < FEE_RATE_UNIT, "feeRate must less FEE_RATE_UNIT");
        _manager = manager;
        _feeRate = feeRate;
    }

    function _validateTimestamp(uint256 timestamp) internal {
        require(timestamp < (block.timestamp + 120) && timestamp > (block.timestamp - 600), "timestamp is expired");
        require(timestamp > _lastTimestampMap[msg.sender], "timestamp is invalid");
        _lastTimestampMap[msg.sender] = timestamp;
    }

    /// @dev Validate if it’s the true owner of the Miner that sign. If yes, accept the Miner and transfer it into the contract and internally record that the Miner belongs to the current message sender.   
    /// @param minerId Miner ID
    /// @param sign Use the old owner adress to sign the content that the miner id already executed the Hex transformation. 
    function confirmTransferMinerIntoSPex(CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp) public {
        require(_contractMiners[minerId]==address(0), "Miner already in SPex");
        _validateTimestamp(timestamp);
        MinerTypes.GetOwnerReturn memory ownerReturn = MinerAPI.getOwner(minerId);

        uint64 onwerUint64 = PrecompilesAPI.resolveAddress(ownerReturn.owner);

        uint64 senderUint64 = PrecompilesAPI.resolveEthAddress(msg.sender);
        if (senderUint64 != onwerUint64) {
            Validator.validateOwnerSign(sign, minerId, onwerUint64, timestamp);
        }
        MinerTypes.GetBeneficiaryReturn memory beneficiaryReturn = MinerAPI.getBeneficiary(minerId);
        CommonTypes.FilAddress memory beneficiary = beneficiaryReturn.active.beneficiary;
        require(keccak256(beneficiary.data) == keccak256(ownerReturn.owner.data), "Beneficiary is not owner");
        require(keccak256(beneficiaryReturn.proposed.new_beneficiary.data) == keccak256(bytes("")), "Pendding beneficiary is not null");
        MinerAPI.changeOwnerAddress(minerId, ownerReturn.proposed);
        _contractMiners[minerId] = msg.sender;
        _minerIdList.push(minerId);
        emit EventMinerInContract(minerId, msg.sender);
    }

    /// @dev Designate Miner & price and list the Miner on sale
    /// @param minerId Miner ID
    /// @param price Sale price
    function listMiner(CommonTypes.FilActorId minerId, uint256 price, address buyer) public onlyMinerOwner(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "Miner already list");
        address owner = _contractMiners[minerId];
        ListMiner memory miner = ListMiner ({
            id: minerId,
            seller: owner,
            buyer: buyer,
            price: price,
            listTime: block.timestamp
        });
        _listMiners[minerId] = miner;
        emit EventList(minerId, owner, price);
    }

    function confirmTransferMinerIntoSPexAndList(CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp, uint256 price, address buyer) public {
        confirmTransferMinerIntoSPex(minerId, sign, timestamp);
        listMiner(minerId, price, buyer);
    }

    /// @dev Edit the price of listed Miner
    /// @param minerId Miner ID
    /// @param newPrice New sale price
    function changePrice(CommonTypes.FilActorId minerId, uint256 newPrice) public onlyMinerOwner(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "Miner not list");
        ListMiner storage miner = _listMiners[minerId];
        miner.price = newPrice;
        emit EventChangePrice(minerId, newPrice);
    }

    /// @dev Set the address that the owner want to transfer out of the contract to the outside ordinary address.
    /// @param minerId Miner ID
    /// @param newOwner New owner address
    function transferOwnerOut(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newOwner) public onlyMinerOwner(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "You must cancel list first");
        MinerAPI.changeOwnerAddress(minerId, newOwner);
        delete _contractMiners[minerId];
        emit EventMinerOutContract(minerId, newOwner);
    }

    /// @dev Cancel the listed on sale Miner order
    /// @param minerId Miner ID
    function cancelList(CommonTypes.FilActorId minerId) public onlyMinerOwner(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "Miner not list");
        delete _listMiners[minerId];
        emit EventCancelList(minerId);
    }

    /// @dev Buy the Miner, buyer pay for the price and target the buyer as new owner of the Miner in the contract and transfer the money to seller. 
    /// @param minerId Miner ID
    function buyMiner(CommonTypes.FilActorId minerId) public payable {
        ListMiner memory miner = _listMiners[minerId];
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(miner.id);
        require(minerIdUint64 > 0, "Miner not list");
        if (miner.buyer != address(0)){
            require(miner.buyer == msg.sender, "The miner has been assigned a buyer, you are not assigned");
        }
        require(msg.value==miner.price, "Incorrent payment amount");
        uint256 toSellerAmount = (miner.price * (FEE_RATE_UNIT - _feeRate)) / FEE_RATE_UNIT;

        delete _listMiners[minerId];
        _contractMiners[minerId] = msg.sender;

        payable(miner.seller).transfer(toSellerAmount);
        emit EventBuy(minerId, miner.seller, miner.price, msg.sender);
    }

    function changeFeeRate(uint256 newFeeRate) public onlyManager {
        require(newFeeRate < FEE_RATE_UNIT, "The feeRate must less FEE_RATE_UNIT");
        _feeRate = newFeeRate;
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

    function withdraw(address payable to, uint256 amount) public payable onlyManager {
        to.transfer(amount);
    }

    function getManager() public view returns (address) {
        return _manager;
    }
    
    function changeManager(address manager) public onlyManager {
        _manager = manager;
    }

    function getFeeRate() public view returns (uint256) {
        return _feeRate;
    }

    function getMinerIdList() public view returns (CommonTypes.FilActorId[] memory) {
        return _minerIdList;
    }
}

