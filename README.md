# SPex is a decentralized storage provider exchange space on FVM

# How it works
* Sellers change the Owner Address to the SPex smart contract and place sell orders
* Buyers request to purchase and send funds to SPex smart contract
* Send payment to Seller after minus the transaction fees
* SPex smart contract transfers the ownership to buyer

### Website
https://spex.website

### Docs
https://docs.spex.website/

### Website Frontend
https://github.com/SPex-team/spex-front

### APP Frontend
https://github.com/SPex-team/AppDemo

### APP Backend
https://github.com/SPex-team/AppSpexBackend


### Interfaces
```solidity
/// @dev Validate if it’s the true owner of the Miner that sign. If yes, accept the Miner and transfer it into the contract and internally record that the Miner belongs to the current message sender.   
/// @param minerId Miner ID
/// @param sign Use the old owner adress to sign the content that the miner id already executed the Hex transformation. 
function ConfirmTransferMinerIntoSPex(string calldata minerId, string calldata sign) public;

/// @dev Designate Miner & price and list the Miner on sale
/// @param minerId Miner ID
/// @param price Sale price
function listMiner(string calldata minerId, uint price) public;

/// @dev Edit the price of listed Miner
/// @param minerId Miner ID
/// @param newPrice New sale price
function ChangePrice(string calldata minerId, uint newPrice) public;

/// @dev Set the address that the owner want to transfer out of the contract to the outside ordinary address.
/// @param minerId Miner ID
/// @param newOwner New owner address
function TransferOwnerOut(string calldata minerId, string calldata newOwner) public;

/// @dev Cancel the listed on sale Miner order
/// @param minerId Miner ID
function CancelList(string calldata minerId) public;

/// @dev Buy the Miner, buyer pay for the price and target the buyer as new owner of the Miner in the contract and transfer the money to seller. 
/// @param minerId Miner ID
function buyMiner(string calldata minerId) payable public;

/// @dev Check owner info of the Miner via Miner ID
/// @param minerId Miner ID
function GetOwnerById(string calldata minerId) view public returns(address);

/// @dev check owner info of the listed Miner via Miner ID
/// @param minerId Miner ID
function GetListMinerById(string calldata minerId) view public returns(ListMiner memory);
```

### Eevents
```solidity
event EventMinerInContract(string minerId, address owner);
event EventList(string minerId, address seller, uint price);
event EventCancelList(string minerId);
event EventBuy(string minerId, address seller, uint price, address buyer);
event EventChangePrice(string minerId, uint newPrice);
event EventMinerOutContract(string minerId, string newOwner);
```