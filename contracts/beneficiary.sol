


// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/PrecompilesAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/utils/FilAddresses.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/types/CommonTypes.sol";

import "fevmate/contracts/utils/FilAddress.sol";

import "./utils/Common.sol";
import "./utils/Validator.sol";


/// @author Mingming Tang
contract SPexBeneficiary {

    event EventPledgeBeneficiaryToSpex(CommonTypes.FilActorId, address, uint, uint, address);
    event EventReleaseBeneficiary(CommonTypes.FilActorId, CommonTypes.FilAddress);
    event EventReleaseBeneficiaryAgain(CommonTypes.FilActorId, CommonTypes.FilAddress);
    event EventBuyMinerDebt(address, CommonTypes.FilActorId, uint);
    event EventChangeMinerDelegator(CommonTypes.FilActorId, address);
    event EventChangeMinerMaxDebtAmount(CommonTypes.FilActorId, uint);
    event EventChangeMinerDisabled(CommonTypes.FilActorId, bool);
    event EventChangeLoanDayRate(CommonTypes.FilActorId, uint);
    event EventChangeMinerReceiveAddress(CommonTypes.FilActorId, address);
    event EventRepayment(address, address, CommonTypes.FilActorId, uint);
    event EventWithdrawRepayment(address, address, CommonTypes.FilActorId, uint);
    event EventSellLoan(address, CommonTypes.FilActorId, uint, uint);
    event EventBuyLoan(address, address, CommonTypes.FilActorId, uint, uint);
    event EventCancelSellLoan(address, CommonTypes.FilActorId);


    struct Miner {
        CommonTypes.FilActorId minerId;
        address delegator;
        uint maxDebtAmount;
        uint loanDayRate;
        address receiveAddress;
        bool disabled;
        uint lastDebtAmount;
        uint lastUpdateTime;
    }

    struct Loan {
        uint lastAmount;
        uint lastUpdateTime;
    }

    struct SellItem {
        uint amount;
        uint price;
    }

    mapping(CommonTypes.FilActorId => Miner) public _miners;
    mapping(address => mapping(CommonTypes.FilActorId => Loan)) public  _loans;
    mapping(address => mapping(CommonTypes.FilActorId => SellItem)) public _sell;
    mapping(CommonTypes.FilActorId => address) public _releasedMinerDelegators;
    // mapping(CommonTypes.FilActorId => mapping(address => uint));
    mapping(address => uint) public _lastTimestampMap;

    address public _foundation;
    uint public _feeRate;
    uint public _maxDebtRate;

    uint constant public MAX_FEE_RATE = 10000;
    uint constant public RATE_BASE = 1000000;

    uint constant public REQUIRED_QUOTA = 1e68 - 1e18;
    int64 constant public REQUIRED_EXPIRATION = type(int64).max;

    modifier onlyFoundation {
        require(msg.sender == _foundation, "You are not the foundation");
        _;
    }

    constructor(address foundation, uint maxDebtRate) {
        require(foundation != address(0), "The foundation address cannot be set zero address");
        _foundation = foundation;
        _maxDebtRate = maxDebtRate;
    }

    function _validateTimestamp(uint timestamp) internal {
        require(timestamp < (block.timestamp + 120) && timestamp > (block.timestamp - 1800), "The timestamp is expired");
        require(timestamp > _lastTimestampMap[msg.sender], "The timestamp is invalid");
        _lastTimestampMap[msg.sender] = timestamp;
    }

    function _transferRepayment(address to, uint amount) internal {
        uint commissionAmount = amount * _feeRate / RATE_BASE;
        uint toUserAmount = msg.value - commissionAmount;
        payable(to).transfer(toUserAmount);
    }

    modifier onlyMinerDelegator(CommonTypes.FilActorId minerId) {
        require(_miners[minerId].delegator == msg.sender, "You are not the delegator of the miner");
        _;
    }

    function _checkMaxDebtAmount(CommonTypes.FilActorId minerId, uint maxDebtAmount) internal view {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(minerId);
        uint minerBalance = FilAddress.toAddress(minerIdUint64).balance;
        require(maxDebtAmount <= (minerBalance * _maxDebtRate / RATE_BASE), "The maxDebtAmount exceeds the maximum dept amount of the miner");
    }

    function _prePledgeBeneficiaryToSpex(CommonTypes.FilActorId minerId, bytes memory sign, uint timestamp, uint maxDebtAmount) internal {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_miners[minerId].minerId);

        require(minerIdUint64 == 0,  "The beneficiary of miner is already transferred into SPex");
        delete _releasedMinerDelegators[minerId];

        MinerTypes.GetOwnerReturn memory ownerReturn = MinerAPI.getOwner(minerId);
        uint64 ownerUint64 = PrecompilesAPI.resolveAddress(ownerReturn.owner);
        uint64 senderUint64 = PrecompilesAPI.resolveEthAddress(msg.sender);
        // if (senderUint64 != ownerUint64) {
        //     _validateTimestamp(timestamp);
        //     Validator.validateOwnerSign(sign, minerId, ownerUint64, timestamp);
        // }

        _checkMaxDebtAmount(minerId, maxDebtAmount);
    }

    function pledgeBeneficiaryToSpex(CommonTypes.FilActorId minerId, bytes memory sign, uint timestamp, uint maxDebtAmount, uint loanDayRate, address receiveAddress, bool disabled) external {

        _prePledgeBeneficiaryToSpex(minerId, sign, timestamp, maxDebtAmount);

        MinerTypes.PendingBeneficiaryChange memory proposedBeneficiaryRet = MinerAPI.getBeneficiary(minerId).proposed;
        // new_quota check

        // uint quota = proposedBeneficiaryRet.new_quota.bigInt2Uint();
        uint quota = Common.bigInt2Uint(proposedBeneficiaryRet.new_quota);
        require(quota == REQUIRED_QUOTA, "Invalid quota");
        int64 expiration = CommonTypes.ChainEpoch.unwrap(proposedBeneficiaryRet.new_expiration);
        uint64 uExpiration = uint64(expiration);
        require(expiration == REQUIRED_EXPIRATION && uExpiration > block.number, "Invalid expiration");

        // change beneficiary to contract
        MinerTypes.ChangeBeneficiaryParams memory changeBeneficiaryParams = MinerTypes.ChangeBeneficiaryParams({
                new_beneficiary: proposedBeneficiaryRet.new_beneficiary,
                new_quota: proposedBeneficiaryRet.new_quota,
                new_expiration: proposedBeneficiaryRet.new_expiration
            });
        MinerAPI.changeBeneficiary(minerId, changeBeneficiaryParams);
        
        Miner memory miner = Miner ({
            minerId: minerId,
            delegator: msg.sender,
            maxDebtAmount: maxDebtAmount,
            loanDayRate: loanDayRate,
            receiveAddress: receiveAddress,
            disabled: disabled,
            lastDebtAmount: 0,
            lastUpdateTime: block.timestamp
        });
        _miners[minerId] = miner;
        emit EventPledgeBeneficiaryToSpex(minerId, msg.sender, maxDebtAmount, loanDayRate, receiveAddress);
    }

    function releaseBeneficiary(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newBeneficiary) external onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_miners[minerId].minerId);
        require(minerIdUint64 != 0,  "The beneficiary of miner is not transferred into SPex");  //TODO: Need to remove?
        require(_miners[minerId].lastDebtAmount == 0 , "The miner is not paid off");
        MinerTypes.ChangeBeneficiaryParams memory changeBeneficiaryParams = MinerTypes.ChangeBeneficiaryParams({
                new_beneficiary: newBeneficiary,
                new_quota: CommonTypes.BigInt(hex"00", false),
                new_expiration: CommonTypes.ChainEpoch.wrap(0)
            });
        MinerAPI.changeBeneficiary(minerId, changeBeneficiaryParams);
        _releasedMinerDelegators[minerId] = _miners[minerId].delegator;
        delete _miners[minerId];
        emit EventReleaseBeneficiary(minerId, newBeneficiary);
    }

    function releaseBeneficiaryAgain(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newBeneficiary) external {
        require(_releasedMinerDelegators[minerId] != address(0), "The miner has not been released");
        require(msg.sender == _releasedMinerDelegators[minerId], "You are not the delegator of the miner");
        MinerTypes.ChangeBeneficiaryParams memory changeBeneficiaryParams = MinerTypes.ChangeBeneficiaryParams({
                new_beneficiary: newBeneficiary,
                new_quota: CommonTypes.BigInt(hex"00", false),
                new_expiration: CommonTypes.ChainEpoch.wrap(0)
            });
        MinerAPI.changeBeneficiary(minerId, changeBeneficiaryParams);
        emit EventReleaseBeneficiaryAgain(minerId, newBeneficiary);
    }

    function changeMinerDelegator(CommonTypes.FilActorId minerId, address newDelegator) public onlyMinerDelegator(minerId) {
        _miners[minerId].delegator = newDelegator;
        emit EventChangeMinerDelegator(minerId, newDelegator);
    }

    function changeMinerMaxDebtAmount(CommonTypes.FilActorId minerId, uint newMaxDebtAmount) public onlyMinerDelegator(minerId) {
        Miner storage miner = _miners[minerId];
        uint blockTimestamp = block.timestamp;
        uint currentDebtAmount = Common.calculatePrincipleAndInterest(miner.lastDebtAmount, miner.lastUpdateTime, blockTimestamp, miner.loanDayRate, RATE_BASE);
        miner.lastDebtAmount = currentDebtAmount;
        miner.lastUpdateTime = blockTimestamp;
        require(newMaxDebtAmount >= currentDebtAmount, "New debt amount smaller than current amount owed");
        _checkMaxDebtAmount(minerId, newMaxDebtAmount);
        miner.maxDebtAmount = newMaxDebtAmount;
        emit EventChangeMinerMaxDebtAmount(minerId, newMaxDebtAmount);
    }

    function changeLoanDayRate(CommonTypes.FilActorId minerId, uint newLoanDayRate) public onlyMinerDelegator(minerId) {
        Miner storage miner = _miners[minerId];
        require(miner.lastDebtAmount == 0, "You must repayment all your depts before you can change LoanDayRate");
        miner.loanDayRate = newLoanDayRate;
        emit EventChangeLoanDayRate(minerId, newLoanDayRate);
    }

    function changeMinerReceiveAddress(CommonTypes.FilActorId minerId, address newReceiveAddress) public onlyMinerDelegator(minerId) {
        _miners[minerId].receiveAddress = newReceiveAddress;
        emit EventChangeMinerReceiveAddress(minerId, newReceiveAddress);
    }

    function changeMinerDisabled(CommonTypes.FilActorId minerId, bool disabled) public onlyMinerDelegator(minerId) {
        _miners[minerId].disabled = disabled;
        emit EventChangeMinerDisabled(minerId, disabled);
    }

    function changeMinerBorrowParameters(
        CommonTypes.FilActorId minerId,
        address newDelegator,
        uint newMaxDebtAmount,
        uint newLoanDayRate,
        address newReceiveAddress,
        bool disabled
    ) external onlyMinerDelegator(minerId) {
        changeMinerDelegator(minerId, newDelegator);
        changeMinerMaxDebtAmount(minerId, newMaxDebtAmount);
        changeLoanDayRate(minerId, newLoanDayRate);
        changeMinerReceiveAddress(minerId, newReceiveAddress);
        changeMinerDisabled(minerId, disabled);
    }

    function buyMinerDebt(CommonTypes.FilActorId minerId) external payable {
        _updateAmount(msg.sender, minerId);
        Miner storage miner = _miners[minerId];
        require(miner.disabled == false, "THe miner already disabled");
        require((miner.lastDebtAmount + msg.value) <= miner.maxDebtAmount, "The sum of debted amount must less than or equal to maxDebtAmount");

        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(minerId);
        uint minerBalance = FilAddress.toAddress(minerIdUint64).balance;
        require((miner.lastDebtAmount + msg.value) <= (minerBalance * _maxDebtRate / RATE_BASE), "The amount must less than or equal than remaining amount");
        _increaseAmount(msg.sender, minerId, msg.value);
        payable(miner.receiveAddress).transfer(msg.value);
        emit EventBuyMinerDebt(msg.sender, minerId, msg.value);
    }

    function sellLoan(CommonTypes.FilActorId minerId, uint amount, uint price) public {
        require(_sell[msg.sender][minerId].amount == 0, "You already have a pending order for this miner");
        Loan storage loan = _loans[msg.sender][minerId];
        Miner storage miner = _miners[minerId];
        uint newAmount = Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, block.timestamp, miner.loanDayRate, RATE_BASE);
        require(amount <= newAmount, "Insufficient amount");
        SellItem memory sellItem = SellItem({
            amount: amount,
            price: price
        });
        _sell[msg.sender][minerId] = sellItem;
        emit EventSellLoan(msg.sender, minerId, amount, price);
    }

    function modifySellLoan(CommonTypes.FilActorId minerId, uint amount, uint price) external {
        cancelSellLoan(minerId);
        sellLoan(minerId, amount, price);
    }

    function cancelSellLoan(CommonTypes.FilActorId minerId) public {
        SellItem storage sellItem = _sell[msg.sender][minerId];
        require(sellItem.amount > 0, "You don't have a pendding order for this miner");
        delete _sell[msg.sender][minerId];
        emit EventCancelSellLoan(msg.sender, minerId);
    }

    function buyLoan(address payable who, CommonTypes.FilActorId minerId) external payable {
        SellItem storage sellItem = _sell[who][minerId];
        require(sellItem.amount != 0, "The user is not selling loan of this miner");
        require(msg.value == sellItem.price, "The pay amount is not equal sale price");
        payable(who).transfer(sellItem.amount);
        _updateAmount(who, minerId);
        _updateAmount(msg.sender, minerId);
        Loan storage sellerLoan = _loans[who][minerId];
        Loan storage buyerLoan = _loans[msg.sender][minerId];
        sellerLoan.lastAmount -= sellItem.amount;
        buyerLoan.lastAmount += sellItem.amount;
        delete _sell[who][minerId];
        emit EventBuyLoan(msg.sender, who, minerId, sellItem.amount, sellItem.price);
    }

    function changeMaxDebtRate(uint newMaxDebtRate) external onlyFoundation {
        _maxDebtRate = newMaxDebtRate;
    }

    function _reduceAmount(address user, CommonTypes.FilActorId minerId, uint amount) internal {
        Loan storage loan = _loans[user][minerId];
        Miner storage miner = _miners[minerId];
        miner.lastDebtAmount -= amount;
        loan.lastAmount -= amount;
    }

    function _increaseAmount(address user, CommonTypes.FilActorId minerId, uint amount) internal {
        Loan storage loan = _loans[user][minerId];
        Miner storage miner = _miners[minerId];
        miner.lastDebtAmount += amount;
        loan.lastAmount += amount;
    }

    function _preRepayment(address who, CommonTypes.FilActorId minerId, uint amount) internal {
        _updateAmount(who, minerId);
        Loan storage loan = _loans[who][minerId];
        SellItem storage sellItem =  _sell[who][minerId];
        require(amount <= loan.lastAmount, "The amount must be less than or equal sum of principal and interest");

        if (sellItem.amount > 0 && amount > loan.lastAmount - sellItem.amount) {
            delete _sell[who][minerId];
            emit EventCancelSellLoan(msg.sender, minerId);
        }
    }

    function _updateAmount(address user, CommonTypes.FilActorId minerId) internal {
        uint blockTimestamp = block.timestamp;
        Loan storage loan = _loans[user][minerId];
        Miner storage miner = _miners[minerId];
        loan.lastAmount = Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, blockTimestamp, miner.loanDayRate, RATE_BASE);
        loan.lastUpdateTime = blockTimestamp;
        miner.lastDebtAmount = Common.calculatePrincipleAndInterest(miner.lastDebtAmount, loan.lastUpdateTime, blockTimestamp, miner.loanDayRate, RATE_BASE);
        miner.lastUpdateTime = blockTimestamp;
    }

    function withdrawRepayment(address payable who, CommonTypes.FilActorId minerId, uint amount) public {
        Miner storage miner = _miners[minerId];
        require(msg.sender == who || msg.sender == miner.delegator, "You are not borrower or delegator of the miner");

        _preRepayment(who, minerId, amount);

        CommonTypes.BigInt memory amountBigInt = Common.uint2BigInt(amount);
        CommonTypes.BigInt memory actuallyAmountBitInt = MinerAPI.withdrawBalance(minerId, amountBigInt);
        require(actuallyAmountBitInt.neg == false, "Failed withdraw balance, Actually withdraw amount is negative");
        uint withdrawnAmount = Common.bigInt2Uint(actuallyAmountBitInt);
        require(withdrawnAmount == amount, "Withdrawn amount is not equal amount");

        _transferRepayment(who, amount);
        _reduceAmount(who, minerId, amount);

        emit EventWithdrawRepayment(msg.sender, who, minerId, amount);
    }

    function batchWithdrawRepayment(address[] memory whoList, CommonTypes.FilActorId[] memory minerIdList, uint[] memory amountList) external {
        require(whoList.length == minerIdList.length, "The lengths of whoList and MinerIdList must be equal");
        require(whoList.length == amountList.length, "The lengths of whoList and amountList must be equal");
        for (uint i=0; i < whoList.length; i++) {
            withdrawRepayment(payable(whoList[i]), minerIdList[i], amountList[i]);
        }
    }

    function repayment(address who, CommonTypes.FilActorId minerId) external payable {
        _preRepayment(who, minerId, msg.value);
        _transferRepayment(who, msg.value);
        _reduceAmount(who, minerId, msg.value);

        emit EventRepayment(msg.sender, who, minerId, msg.value);
    }

    function batchRepayment(address[] memory whoList, CommonTypes.FilActorId[] memory minerIdList, uint[] memory amountList) external {
        require(whoList.length == minerIdList.length, "The lengths of whoList and MinerIdList must be equal");
        require(whoList.length == amountList.length, "The lengths of whoList and amountList must be equal");
        for (uint i=0; i<whoList.length; i++) {
            _preRepayment(payable(whoList[i]), minerIdList[i], amountList[i]);
            _transferRepayment(payable(whoList[i]), amountList[i]);
            _reduceAmount(payable(whoList[i]), minerIdList[i], amountList[i]);
        }
    }

    function getCurrentTotalAmountOwed(CommonTypes.FilActorId minerId) external view returns(uint) {
        Miner storage miner = _miners[minerId];
        return Common.calculatePrincipleAndInterest(miner.lastDebtAmount, miner.lastUpdateTime, block.timestamp, miner.loanDayRate, RATE_BASE);
    }

    function getCurrentAmountOwedToLender(address lender, CommonTypes.FilActorId minerId) external view returns(uint) {
        Loan storage loan = _loans[lender][minerId];
        return Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, block.timestamp, _miners[minerId].loanDayRate, RATE_BASE);
    }

    function changeFoundation(address foundation) external onlyFoundation {
        require(foundation != address(0), "The foundation cannot be set to zero address");
        _foundation = foundation;
    }

    function changeFeeRate(uint newFeeRate) external onlyFoundation {
        require(newFeeRate <= MAX_FEE_RATE, "The fee rate must less than or equal MAX_FEE_RATE");
        _feeRate = newFeeRate;
    }

    function withdraw(address payable to, uint amount) external payable onlyFoundation {
        to.transfer(amount);
    }
}