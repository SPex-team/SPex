// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/MinerTypes.sol";

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/types/AccountTypes.sol";

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
    event EventLendToMiner(address, CommonTypes.FilActorId, uint);
    event EventChangeMinerDelegator(CommonTypes.FilActorId, address);
    event EventChangeMinerMaxDebtAmount(CommonTypes.FilActorId, uint);
    event EventChangeMinerDisabled(CommonTypes.FilActorId, bool);
    event EventChangeMinerLoanInterestRate(CommonTypes.FilActorId, uint);
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
        uint loanInterestRate;
        address receiveAddress;
        bool disabled;
        uint principleAmount;
        uint lastDebtAmount;
        uint lastUpdateTime;
    }

    struct Loan {
        uint principleAmount;
        uint lastAmount;
        uint lastUpdateTime;
    }

    struct SellItem {
        uint amount;
        uint price;
    }

    mapping(CommonTypes.FilActorId => Miner) public _miners;
    mapping(address => mapping(CommonTypes.FilActorId => Loan)) public  _loans;
    mapping(address => mapping(CommonTypes.FilActorId => SellItem)) public _sales;
    mapping(CommonTypes.FilActorId => address) public _releasedMinerDelegators;
    // mapping(CommonTypes.FilActorId => mapping(address => uint));
    mapping(address => uint) public _lastTimestampMap;

    address public _foundation;
    uint public _feeRate;
    uint public _maxDebtRate;
    uint public _minLendAmount;

    uint constant public MAX_FEE_RATE = 10000;
    uint constant public RATE_BASE = 1000000;

    uint constant public REQUIRED_QUOTA = 1e68 - 1e18;
    int64 constant public REQUIRED_EXPIRATION = type(int64).max;

    constructor(address foundation, uint maxDebtRate) {
        require(foundation != address(0), "Foundation address cannot be zero address");
        _foundation = foundation;
        _maxDebtRate = maxDebtRate;
    }

    function _validateTimestamp(uint timestamp) internal {
        require(timestamp < (block.timestamp + 120) && timestamp > (block.timestamp - 1800), "Provided timestamp expired");
        require(timestamp > _lastTimestampMap[msg.sender], "Provided timestamp must be bigger than last one provided");
        _lastTimestampMap[msg.sender] = timestamp;
    }

    modifier onlyMinerDelegator(CommonTypes.FilActorId minerId) {
        require(_miners[minerId].delegator == msg.sender, "Only miner's delegator allowed");
        _;
    }

    function _checkMaxDebtAmount(CommonTypes.FilActorId minerId, uint maxDebtAmount) internal view {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(minerId);
        uint minerBalance = FilAddress.toAddress(minerIdUint64).balance;
        require(maxDebtAmount <= (minerBalance * _maxDebtRate / RATE_BASE), "Specified max debt amount exceeds max allowed by miner balance");
    }

    function _prePledgeBeneficiaryToSpex(CommonTypes.FilActorId minerId, bytes memory sign, uint timestamp, uint maxDebtAmount) internal {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_miners[minerId].minerId);

        require(minerIdUint64 == 0,  "Beneficiary already pledged to SPex loan");
        delete _releasedMinerDelegators[minerId];

        MinerTypes.GetOwnerReturn memory ownerReturn = MinerAPI.getOwner(minerId);
        uint64 ownerUint64 = PrecompilesAPI.resolveAddress(ownerReturn.owner);
        uint64 senderUint64 = PrecompilesAPI.resolveEthAddress(msg.sender);
        // if (senderUint64 != ownerUint64) {
        //     _validateTimestamp(timestamp);
        //     Validator.validateOwnerSignForBeneficiary(sign, minerId, ownerUint64, timestamp);
        // }

        _checkMaxDebtAmount(minerId, maxDebtAmount);
    }

    function pledgeBeneficiaryToSpex(CommonTypes.FilActorId minerId, bytes memory sign, uint timestamp, uint maxDebtAmount, uint loanInterestRate, address receiveAddress, bool disabled) external {

        _prePledgeBeneficiaryToSpex(minerId, sign, timestamp, maxDebtAmount);

        MinerTypes.PendingBeneficiaryChange memory proposedBeneficiaryRet = MinerAPI.getBeneficiary(minerId).proposed;
        // new_quota check

        // uint quota = proposedBeneficiaryRet.new_quota.bigInt2Uint();
        uint quota = Common.bigInt2Uint(proposedBeneficiaryRet.new_quota);
        require(quota == REQUIRED_QUOTA, "Invalid quota");
        int64 expiration = CommonTypes.ChainEpoch.unwrap(proposedBeneficiaryRet.new_expiration);
        uint64 uExpiration = uint64(expiration);
        require(expiration == REQUIRED_EXPIRATION && uExpiration > block.number, "Invalid expiration time");

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
            loanInterestRate: loanInterestRate,
            receiveAddress: receiveAddress,
            disabled: disabled,
            principleAmount: 0,
            lastDebtAmount: 0,
            lastUpdateTime: block.timestamp
        });
        _miners[minerId] = miner;
        emit EventPledgeBeneficiaryToSpex(minerId, msg.sender, maxDebtAmount, loanInterestRate, receiveAddress);
    }

    function releaseBeneficiary(CommonTypes.FilActorId minerId, CommonTypes.FilAddress memory newBeneficiary) external onlyMinerDelegator(minerId) {
        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(_miners[minerId].minerId);
        require(minerIdUint64 != 0,  "Beneficiary of miner is not pledged to SPex");
        require(_miners[minerId].lastDebtAmount == 0 , "Debt not fully paid off");
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
        require(_releasedMinerDelegators[minerId] != address(0), "The miner's beneficiary has not been released");
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
        uint currentDebtAmount = _updateMinerDebtAmount(minerId);
        require(newMaxDebtAmount >= currentDebtAmount, "New max debt amount smaller than current amount owed");
        _checkMaxDebtAmount(minerId, newMaxDebtAmount);
        miner.maxDebtAmount = newMaxDebtAmount;
        emit EventChangeMinerMaxDebtAmount(minerId, newMaxDebtAmount);
    }

    function changeMinerLoanInterestRate(CommonTypes.FilActorId minerId, uint newLoanInterestRate) public onlyMinerDelegator(minerId) {
        Miner storage miner = _miners[minerId];
        require(miner.lastDebtAmount == 0, "Debt not fully paid off");
        miner.loanInterestRate = newLoanInterestRate;
        emit EventChangeMinerLoanInterestRate(minerId, newLoanInterestRate);
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
        uint newLoanInterestRate,
        address newReceiveAddress,
        bool disabled
    ) external onlyMinerDelegator(minerId) {
        changeMinerDelegator(minerId, newDelegator);
        changeMinerMaxDebtAmount(minerId, newMaxDebtAmount);
        changeMinerLoanInterestRate(minerId, newLoanInterestRate);
        changeMinerReceiveAddress(minerId, newReceiveAddress);
        changeMinerDisabled(minerId, disabled);
    }

    function lendToMiner(CommonTypes.FilActorId minerId, uint expectedInterestRate) external payable {
        Miner storage miner = _miners[minerId];
        require(expectedInterestRate <= miner.loanInterestRate, "Interest rate lower than expected");
        require(miner.disabled == false, "Lending for this miner is disabled");
        require(msg.value >= _minLendAmount, "Lend amount smaller than minimum allowed");
        _updateOwedAmounts(msg.sender, minerId);
        require((miner.lastDebtAmount + msg.value) <= miner.maxDebtAmount, "Debt amount after lend large than allowed by miner");

        uint64 minerIdUint64 = CommonTypes.FilActorId.unwrap(minerId);
        uint minerBalance = FilAddress.toAddress(minerIdUint64).balance;
        require((miner.lastDebtAmount + msg.value) <= (minerBalance * _maxDebtRate / RATE_BASE), "Debt rate of miner after lend larger than allowed");
        _increaseOwedAmounts(msg.sender, minerId, msg.value);
        payable(miner.receiveAddress).transfer(msg.value);
        emit EventLendToMiner(msg.sender, minerId, msg.value);
    }

    function sellLoan(CommonTypes.FilActorId minerId, uint amount, uint price) public {
        require(_sales[msg.sender][minerId].amount == 0, "Sale already exists");
        uint newAmount = _updateLenderOwedAmount(msg.sender, minerId);
        require(amount <= newAmount, "Insufficient owed amount");
        SellItem memory sellItem = SellItem({
            amount: amount,
            price: price
        });
        _sales[msg.sender][minerId] = sellItem;
        emit EventSellLoan(msg.sender, minerId, amount, price);
    }

    function modifyLoanSale(CommonTypes.FilActorId minerId, uint amount, uint price) external {
        cancelLoanSale(minerId);
        sellLoan(minerId, amount, price);
    }

    function cancelLoanSale(CommonTypes.FilActorId minerId) public {
        SellItem storage sellItem = _sales[msg.sender][minerId];
        require(sellItem.amount > 0, "Sale don't exist");
        delete _sales[msg.sender][minerId];
        emit EventCancelSellLoan(msg.sender, minerId);
    }

    function buyLoan(address payable seller, CommonTypes.FilActorId minerId) external payable {
        SellItem storage sellItem = _sales[seller][minerId];
        require(sellItem.amount != 0, "Sale don't exist");
        require(msg.value == sellItem.price, "Paid amount not equal to sale price");
        payable(seller).transfer(sellItem.price);
        _updateLenderOwedAmount(seller, minerId);
        _updateLenderOwedAmount(msg.sender, minerId);
        Loan storage sellerLoan = _loans[seller][minerId];
        Loan storage buyerLoan = _loans[msg.sender][minerId];
        uint principleChange = sellerLoan.principleAmount * sellItem.amount + (sellerLoan.lastAmount - 1) / sellerLoan.lastAmount;  //Round up
        sellerLoan.lastAmount -= sellItem.amount;
        sellerLoan.principleAmount -= principleChange;
        buyerLoan.lastAmount += sellItem.amount;
        buyerLoan.principleAmount += principleChange;
        delete _sales[seller][minerId];
        emit EventBuyLoan(msg.sender, seller, minerId, sellItem.amount, sellItem.price);
    }

    function _preRepayment(address lender, CommonTypes.FilActorId minerId, uint amount) internal {
        _updateOwedAmounts(lender, minerId);
        Loan storage loan = _loans[lender][minerId];
        SellItem storage sellItem =  _sales[lender][minerId];
        
        if (sellItem.amount > 0 && amount > loan.lastAmount - sellItem.amount) {
            delete _sales[lender][minerId];
            emit EventCancelSellLoan(msg.sender, minerId);
        }
    }

    function withdrawRepayment(address payable lender, CommonTypes.FilActorId minerId, uint amount) public returns (uint actualRepaymentAmount) {
        Miner storage miner = _miners[minerId];
        require(msg.sender == lender || msg.sender == miner.delegator, "You are not lender or delegator of the miner");

        _preRepayment(lender, minerId, amount);

        actualRepaymentAmount = _reduceOwedAmounts(lender, minerId, amount);

        CommonTypes.BigInt memory amountBigInt = Common.uint2BigInt(actualRepaymentAmount);
        CommonTypes.BigInt memory actuallyAmountBitInt = MinerAPI.withdrawBalance(minerId, amountBigInt);
        require(actuallyAmountBitInt.neg == false, "Failed withdraw balance; actual withdraw amount is negative");
        uint withdrawnAmount = Common.bigInt2Uint(actuallyAmountBitInt);
        require(withdrawnAmount == actualRepaymentAmount, "Withdrawn amount not equal to repaid amount");

        _transferRepayment(lender, actualRepaymentAmount);

        emit EventWithdrawRepayment(msg.sender, lender, minerId, amount);
    }

    function batchWithdrawRepayment(address[] memory lenderList, CommonTypes.FilActorId[] memory minerIdList, uint[] memory amountList) external returns (uint actuallRepaymentAmount) {
        require(lenderList.length == minerIdList.length, "The lengths of lenderList and MinerIdList must be equal");
        require(lenderList.length == amountList.length, "The lengths of lenderList and amountList must be equal");
        for (uint i = 0; i < lenderList.length; i++) {
            actuallRepaymentAmount += withdrawRepayment(payable(lenderList[i]), minerIdList[i], amountList[i]);
        }
    }

    function batchWithdrawRepaymentWithTotalAmount(address[] memory lenderList, CommonTypes.FilActorId[] memory minerIdList, uint totalAmount) external returns (uint actualRepaymentAmount) {
        require(lenderList.length == minerIdList.length, "The lengths of lenderList and MinerIdList must be equal");

        uint amountRemaining = totalAmount;
        for (uint i = 0; i < lenderList.length; i++) {
            uint actualRepaid = withdrawRepayment(payable(lenderList[i]), minerIdList[i], amountRemaining);
            amountRemaining -= actualRepaid;
            actualRepaymentAmount += actualRepaid;
            if (amountRemaining == 0) break;
        }
    }

    function directRepayment(address lender, CommonTypes.FilActorId minerId) external payable returns (uint actualRepaymentAmount) {
        uint messageValue = msg.value;
        _preRepayment(lender, minerId, messageValue);
        actualRepaymentAmount = _reduceOwedAmounts(lender, minerId, messageValue);
        _transferRepayment(lender, actualRepaymentAmount);
        payable(msg.sender).transfer(messageValue - actualRepaymentAmount);
        emit EventRepayment(msg.sender, lender, minerId, actualRepaymentAmount);
    }

    function batchDirectRepayment(address[] memory lenderList, CommonTypes.FilActorId[] memory minerIdList, uint[] memory amountList) external payable returns (uint[] memory actualRepaymentAmounts) {
        require(lenderList.length == minerIdList.length, "The lengths of lenderList and MinerIdList must be equal");
        require(lenderList.length == amountList.length, "The lengths of lenderList and amountList must be equal");
        
        uint totalRepaid;
        actualRepaymentAmounts = new uint[](lenderList.length);
        
        for (uint i = 0; i < lenderList.length; i++) {
            _preRepayment(payable(lenderList[i]), minerIdList[i], amountList[i]);
            
            uint actualRepaid = _reduceOwedAmounts(payable(lenderList[i]), minerIdList[i], amountList[i]);
            totalRepaid += actualRepaid;
            actualRepaymentAmounts[i] = actualRepaid;

            _transferRepayment(payable(lenderList[i]), actualRepaid);
            emit EventRepayment(msg.sender, lenderList[i], minerIdList[i], actualRepaid);
        }

        require(totalRepaid <= msg.value, "Insufficient funds provided");
        payable(msg.sender).transfer(msg.value - totalRepaid);
    }

    function batchDirectRepaymentWithTotalAmount(address[] memory lenderList, CommonTypes.FilActorId[] memory minerIdList) external payable returns (uint[] memory actualRepaymentAmounts) {
        require(lenderList.length == minerIdList.length, "The lengths of lenderList and MinerIdList must be equal");
        
        uint amountRemaining = msg.value;
        actualRepaymentAmounts = new uint[](lenderList.length);
        
        for (uint i = 0; i < lenderList.length; i++) {
            address payable lender = payable(lenderList[i]);
            CommonTypes.FilActorId minerId = minerIdList[i];

            _updateOwedAmounts(lender, minerId);
            
            uint actualRepaid = _reduceOwedAmounts(lender, minerId, amountRemaining);
            amountRemaining -= actualRepaid;
            actualRepaymentAmounts[i] = actualRepaid;

            Loan storage loan = _loans[lender][minerId];
            SellItem storage sellItem =  _sales[lender][minerId];
            if (sellItem.amount > 0 && actualRepaid > loan.lastAmount - sellItem.amount) {
                delete _sales[lender][minerId];
                emit EventCancelSellLoan(msg.sender, minerId);
            }

            _transferRepayment(lender, actualRepaid);
            emit EventRepayment(msg.sender, lender, minerId, actualRepaid);

            if(amountRemaining == 0) break;
        }

        payable(msg.sender).transfer(amountRemaining);
    }

    function _reduceOwedAmounts(address lender, CommonTypes.FilActorId minerId, uint amount) internal returns (uint amountRepaid) {
        Loan storage loan = _loans[lender][minerId];
        Miner storage miner = _miners[minerId];
        if (amount < loan.lastAmount) { //Payed less than total amount owed to lender
            amountRepaid = amount;
            miner.lastDebtAmount -= amount;
            loan.lastAmount -= amount;
        } else {    //Payed more or equal to total debt
            amountRepaid = loan.lastAmount;
            miner.lastDebtAmount -= loan.lastAmount;
            loan.lastAmount = 0;
        }
        //The user have payed back more than interest in this case, so all remaining debt are principle
        if (loan.lastAmount < loan.principleAmount) loan.principleAmount = loan.lastAmount;
        if (miner.lastDebtAmount < miner.principleAmount)  miner.principleAmount = miner.lastDebtAmount;
    }

    function _increaseOwedAmounts(address lender, CommonTypes.FilActorId minerId, uint amount) internal {
        Loan storage loan = _loans[lender][minerId];
        Miner storage miner = _miners[minerId];
        miner.principleAmount += amount;
        miner.lastDebtAmount += amount;
        loan.principleAmount += amount;
        loan.lastAmount += amount;
    }

    function _updateOwedAmounts(address lender, CommonTypes.FilActorId minerId) internal {
        uint blockTimestamp = block.timestamp;
        Loan storage loan = _loans[lender][minerId];
        Miner storage miner = _miners[minerId];
        loan.lastAmount = Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, blockTimestamp, miner.loanInterestRate, RATE_BASE);
        loan.lastUpdateTime = blockTimestamp;
        miner.lastDebtAmount = Common.calculatePrincipleAndInterest(miner.lastDebtAmount, miner.lastUpdateTime, blockTimestamp, miner.loanInterestRate, RATE_BASE);
        miner.lastUpdateTime = blockTimestamp;
    }

    function _updateMinerDebtAmount(CommonTypes.FilActorId minerId) internal returns (uint currentDebtAmount) {
        uint blockTimestamp = block.timestamp;
        Miner storage miner = _miners[minerId];
        currentDebtAmount = Common.calculatePrincipleAndInterest(miner.lastDebtAmount, miner.lastUpdateTime, blockTimestamp, miner.loanInterestRate, RATE_BASE);
        miner.lastDebtAmount = currentDebtAmount;
        miner.lastUpdateTime = blockTimestamp;
    }

    function _updateLenderOwedAmount(address lender, CommonTypes.FilActorId minerId) internal returns (uint currentOwedAmount) {
        uint blockTimestamp = block.timestamp;
        Loan storage loan = _loans[lender][minerId];
        currentOwedAmount = Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, blockTimestamp, _miners[minerId].loanInterestRate, RATE_BASE);
        loan.lastAmount = currentOwedAmount;
        loan.lastUpdateTime = blockTimestamp;
    }

    function _transferRepayment(address to, uint amount) internal {
        uint commissionAmount = amount * _feeRate / RATE_BASE;
        uint toUserAmount = amount - commissionAmount;
        payable(to).transfer(toUserAmount);
    }

    function getCurrentMinerOwedAmount(CommonTypes.FilActorId minerId) external view returns(uint totalDebt, uint principal) {
        Miner storage miner = _miners[minerId];
        totalDebt = Common.calculatePrincipleAndInterest(miner.lastDebtAmount, miner.lastUpdateTime, block.timestamp, miner.loanInterestRate, RATE_BASE);
        principal = miner.principleAmount;
    }

    function getCurrentLenderOwedAmount(address lender, CommonTypes.FilActorId minerId) external view returns(uint totalAmountOwed, uint principal) {
        Loan storage loan = _loans[lender][minerId];
        totalAmountOwed = Common.calculatePrincipleAndInterest(loan.lastAmount, loan.lastUpdateTime, block.timestamp, _miners[minerId].loanInterestRate, RATE_BASE);
        principal = loan.principleAmount;
    }

    modifier onlyFoundation {
        require(msg.sender == _foundation, "Only foundation allowed");
        _;
    }

    function changeFoundation(address foundation) external onlyFoundation {
        require(foundation != address(0), "Foundation cannot be set to zero address");
        _foundation = foundation;
    }

    function changeMaxDebtRate(uint newMaxDebtRate) external onlyFoundation {
        _maxDebtRate = newMaxDebtRate;
    }

    function changeFeeRate(uint newFeeRate) external onlyFoundation {
        require(newFeeRate <= MAX_FEE_RATE, "Fee rate must less than or equal to MAX_FEE_RATE");
        _feeRate = newFeeRate;
    }

    function changeMinLendAmount(uint newMinLendAmount) external onlyFoundation {
        _minLendAmount = newMinLendAmount;
    }

    function withdraw(address payable to, uint amount) external payable onlyFoundation {
        to.transfer(amount);
    }
}