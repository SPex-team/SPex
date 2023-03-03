// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@zondax/filecoin-solidity/contracts/v0.8/MinerAPI.sol";
import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";


library Validator {

    function validateOwnerSign(
        bytes memory sign,
        bytes memory minderId,
        bytes memory owner,
        uint64 timestamp
    ) external {
        require(timestamp>block.timestamp && timestamp < (block.timestamp + 600), "Sign is expired");
        bytes memory message = abi.encodePacked(
            "validateOwnerSign",
            minderId,
            owner,
            msg.sender,
            getChainId(),
            timestamp
        );
        AccountAPI.authenticateMessage(
            owner,
            AccountTypes.AuthenticateMessageParams({
                signature: sign,
                message: message
            })
        );
    }

    function getChainId() private view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }
}