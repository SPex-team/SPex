// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract SPEX {

    event EventMinerInContract(string minerId, address owner);
    event EventList(string minerId, address seller, uint price);
    event EventCancelList(string minerId);
    event EventBuy(string minerId, address seller, uint price, address buyer);
    event EventChangePrice(string minerId, uint newPrice);
    event EventMinerOutContract(string minerId, string newOwner);

    struct ListMiner {
        string id;
        address seller;
        uint price;
        uint listTime;
    }

    mapping(string => address) _contractMiners;

    mapping(string => ListMiner) _listMiners;

    address payable _feeTo;
    address _manager;

    uint256 _feeRate;

    uint256 constant _feeRateUnit = 10000;


    constructor(address manager, address payable feeTo, uint256 feeRate) {
        require(feeRate < _feeRateUnit, "feeRate must less _feeRateUnit");
        _manager = manager;
        _feeTo = feeTo;
        _feeRate = feeRate;
    }

    function changeFeeTo(address payable newFeeTo) public {
        require(msg.sender == _manager, "Must manager can change");
        _feeTo = newFeeTo;
    }

    function changeFeeRate(uint256 newFeeRate) public {
        require(newFeeRate < _feeRateUnit, "feeRate must less _feeRateUnit");
        require(msg.sender == _manager, "Must manager can change");
        _feeRate = newFeeRate;
    }

    function confirmChangeOwnerToSpex(string calldata minerId, string calldata sign) public {
        // verify that is miner in contract
        // verify signature
        // accept miner

        _contractMiners[minerId] = msg.sender;
        emit EventMinerInContract(minerId, msg.sender);
    }

    function listMiner(string calldata minerId, uint price) public {
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        require(bytes(_listMiners[minerId].id).length == 0, "Miner already list");
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

    function changePrice(string calldata minerId, uint newPrice) public {
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        ListMiner memory miner = _listMiners[minerId];
        miner.price = newPrice;
        emit EventChangePrice(minerId, newPrice);
    }

    function changeOwner(string calldata minerId, string calldata newOwner) public {
        require(bytes(_listMiners[minerId].id).length == 0, "You must cancel list first");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        // set owner to new owner
        emit EventMinerOutContract(minerId, newOwner);
    }

    function cancelList(string calldata minerId) public {
        require(bytes(_listMiners[minerId].id).length > 0, "Miner not list");
        require(_contractMiners[minerId]==msg.sender, "You are not the owner of miner");
        delete _listMiners[minerId];
        emit EventCancelList(minerId);
    }

    function buyMiner(string calldata minerId) public {
        // ListMiner memory miner = _listMiners[minerId];
        // require(miner.listTime > 0, "Miner not list");
        // require(msg.value==msg.value, "Amount is incorrect");
        // uint256 transactionFee = miner.price * _feeRate / _feeRateUnit;
        // uint256 toSellerAmount = (miner.price * (_feeRateUnit - _feeRate)) / _feeRateUnit;
        // _feeTo.transfer(transactionFee);
        // payable(miner.seller).transfer(toSellerAmount);
        delete _listMiners[minerId];
        emit EventBuy(minerId, miner.seller, miner.price, msg.sender);
    }

    function getOwnerById(string calldata minerId) view public returns(address) {
        return _contractMiners[minerId];
    }

    function getListMinerById(string calldata minerId) view public returns(ListMiner memory) {
        return _listMiners[minerId];
    }
}

