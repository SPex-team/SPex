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
    event EventList(CommonTypes.FilActorId minerId, address targerBuyer, uint256 price);
    event EventCancelList(CommonTypes.FilActorId minerId);
    event EventBuy(CommonTypes.FilActorId minerId, address targetBuyer, uint256 price);
    event EventChangePrice(CommonTypes.FilActorId minerId, uint256 prevPrice, uint256 currPrice);
    event EventMinerOutContract(CommonTypes.FilActorId minerId, CommonTypes.FilAddress newOwner);


    struct ListMiner {
        // the Miner ID(Address)
        CommonTypes.FilActorId id;
        // the miner seller
        address seller;
        address targetBuyer;
        // the current price of the miner
        uint256 price;
        // the list time
        uint listTime;
    }

    mapping(CommonTypes.FilActorId => address) _minersDelegators;
    mapping(CommonTypes.FilActorId => address) _transferOutMinersDelegators;
    mapping(CommonTypes.FilActorId => ListMiner) _listMiners;
    mapping(address => uint256) public _lastTimestampMap;

    address _foundation;
    uint256 constant public FEE_RATE = 100;
    uint256 constant public FEE_RATE_BASE = 10000;
    uint256 constant public MAX_COMMISSION = 500e18;

    modifier onlyFoundation {
        require(msg.sender == _foundation, "You are not the foundation");
        _;
    }

    modifier onlyMinerDelegator(CommonTypes.FilActorId minerId) {
        require(_minersDelegators[minerId]==msg.sender, "You are not the delegator of the miner");
        _;
    }

    constructor(address foundation) {
        require(foundation != address(0), "The foundation address cannot be set zero address");

        _foundation = foundation;
    }

    function _validateTimestamp(uint256 timestamp) internal {
        require(timestamp < (block.timestamp + 120) && timestamp > (block.timestamp - 1800), "The timestamp is expired");
        require(timestamp > _lastTimestampMap[msg.sender], "The timestamp is invalid");
        _lastTimestampMap[msg.sender] = timestamp;
    }

    /// @dev Validate if it’s the true owner of the Miner that sign. If yes, accept the Miner and transfer it into the contract and internally record that the Miner belongs to the current message sender.   
    /// @param minerId Miner ID
    /// @param sign Use the old owner adress to sign the content that the miner id already executed the Hex transformation. 
    function confirmTransferMinerIntoSPex(CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp) public {
        require(_minersDelegators[minerId]==address(0), "The miner is already transferred into SPex");
        delete _transferOutMinersDelegators[minerId];
        _validateTimestamp(timestamp);

        // MinerTypes.GetOwnerReturn memory ownerReturn = MinerAPI.getOwner(minerId);

        // uint64 ownerUint64 = PrecompilesAPI.resolveAddress(ownerReturn.owner);

        // uint64 senderUint64 = PrecompilesAPI.resolveEthAddress(msg.sender);
        // if (senderUint64 != ownerUint64) {
        //     _validateTimestamp(timestamp);
        //     Validator.validateOwnerSign(sign, minerId, ownerUint64, timestamp);
        // }
        // MinerTypes.GetBeneficiaryReturn memory beneficiaryReturn = MinerAPI.getBeneficiary(minerId);
        // CommonTypes.FilAddress memory beneficiary = beneficiaryReturn.active.beneficiary;
        // require(keccak256(beneficiary.data) == keccak256(ownerReturn.owner.data), "Beneficiary address should be the owner");
        // require(keccak256(beneficiaryReturn.proposed.new_beneficiary.data) == keccak256(bytes("")), "Pending beneficiary is not null");
        // MinerAPI.changeOwnerAddress(minerId, ownerReturn.proposed);
        _minersDelegators[minerId] = msg.sender;
        emit EventMinerInContract(minerId, msg.sender);
    }

    /// @dev Designate Miner & price and list the Miner on sale
    /// @param minerId Miner ID
    /// @param price Sale price
    function listMiner(CommonTypes.FilActorId minerId, uint256 price, address targetBuyer) public onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "The miner is already listed");
        address owner = _minersDelegators[minerId];
        ListMiner memory miner = ListMiner ({
            id: minerId,
            seller: owner,
            targetBuyer: targetBuyer,
            price: price,
            listTime: block.timestamp
        });
        _listMiners[minerId] = miner;
        emit EventList(minerId, targetBuyer, price);
    }

    function confirmTransferMinerIntoSPexAndList(CommonTypes.FilActorId minerId, bytes memory sign, uint256 timestamp, uint256 price, address targetBuyer) external {
        confirmTransferMinerIntoSPex(minerId, sign, timestamp);
        listMiner(minerId, price, targetBuyer);
    }

    /// @dev Edit the price of listed Miner
    /// @param minerId Miner ID
    /// @param newPrice New sale price
    function changePrice(CommonTypes.FilActorId minerId, uint256 newPrice) external onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "The miner is not listed");
        ListMiner storage miner = _listMiners[minerId];
        uint256 prevPrice = miner.price;
        miner.price = newPrice;
        emit EventChangePrice(minerId, prevPrice, newPrice);
    }

    /// @dev Set the address that the owner want to transfer out of the contract to the outside ordinary address.
    /// @param minerId Miner ID
    /// @param newOwner New owner address
    function transferOwnerOut(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newOwner) external onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 == 0, "You must cancel list first");
        // MinerAPI.changeOwnerAddress(minerId, newOwner);
        _transferOutMinersDelegators[minerId] = _minersDelegators[minerId];
        delete _minersDelegators[minerId];
        emit EventMinerOutContract(minerId, newOwner);
    }

    function transferOwnerOutAgain(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newOwner) external {
        require(_transferOutMinersDelegators[minerId] == msg.sender, "You are not the delegator of the miner");
        // MinerAPI.changeOwnerAddress(minerId, newOwner);
        emit EventMinerOutContract(minerId, newOwner);
    }

    /// @dev Cancel the listed on sale Miner order
    /// @param minerId Miner ID
    function cancelList(CommonTypes.FilActorId minerId) external onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_listMiners[minerId].id);
        require(minerIdUint64 > 0, "The miner is not listed");
        delete _listMiners[minerId];
        emit EventCancelList(minerId);
    }

    /// @dev Buy the Miner, buyer pay for the price and target the buyer as new owner of the Miner in the contract and transfer the money to seller. 
    /// @param minerId Miner ID
    function buyMiner(CommonTypes.FilActorId minerId) external payable {
        ListMiner storage miner = _listMiners[minerId];
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(miner.id);
        require(minerIdUint64 > 0, "The miner is not listed");
        require(msg.sender != miner.seller, "You can not buy your own miner");
        if (miner.targetBuyer != address(0)){
            require(miner.targetBuyer == msg.sender, "You are not the targeted buyer");
        }
        require(msg.value == miner.price, "Incorrect payment amount");

        uint256 commissionAmount = miner.price * FEE_RATE / FEE_RATE_BASE;
        if (commissionAmount >  MAX_COMMISSION) {
            commissionAmount = MAX_COMMISSION;
        }
        uint256 toSellerAmount = miner.price - commissionAmount;

        address seller = miner.seller;
        delete _listMiners[minerId];
        _minersDelegators[minerId] = msg.sender;

        payable(seller).transfer(toSellerAmount);
        emit EventBuy(minerId, msg.sender, miner.price);
    }

    /// @dev Check owner info of the Miner via Miner ID
    /// @param minerId Miner ID
    function getMinerDelegator(CommonTypes.FilActorId minerId) view external returns(address) {
        return _minersDelegators[minerId];
    }


    function getTransferOutMinerDelegator(CommonTypes.FilActorId minerId) view external returns(address) {
        return _transferOutMinersDelegators[minerId];
    }

    /// @dev check owner info of the listed Miner via Miner ID
    /// @param minerId Miner ID
    function getListMinerById(CommonTypes.FilActorId minerId) view external returns(ListMiner memory) {
        return _listMiners[minerId];
    }

    function withdraw(address payable to, uint256 amount) external payable onlyFoundation {
        to.transfer(amount);
    }

    function getFoundation() external view returns (address) {
        return _foundation;
    }
    
    function changeFoundation(address foundation) external onlyFoundation {
        require(foundation != address(0), "The foundation cannot be set to zero address");
        _foundation = foundation;
    }
}

