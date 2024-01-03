// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@zondax/filecoin-solidity/contracts/v0.8/AccountAPI.sol";


library Validator {

    function validateOwnerSign(
        bytes memory sign,
        CommonTypes.FilActorId minderId,
        uint64 owner,
        uint256 timestamp
    ) internal {
        bytes memory message = abi.encode(
            "validateOwnerSign",
            minderId,
            owner,
            msg.sender,
            getChainId(),
            timestamp
        );
        CommonTypes.FilActorId ownerActorId = CommonTypes.FilActorId.wrap(owner);
        AccountAPI.authenticateMessage(
            ownerActorId,
            AccountTypes.AuthenticateMessageParams({
                signature: sign,
                message: message
            })
        );
    }

    function validateOwnerSignForBeneficiary(
        bytes memory sign,
        CommonTypes.FilActorId minderId,
        uint64 owner,
        uint256 timestamp
    ) internal {
        bytes memory message = abi.encode(
            "validateOwnerSign_ForBeneficiary",
            minderId,
            owner,
            msg.sender,
            getChainId(),
            timestamp
        );
        CommonTypes.FilActorId ownerActorId = CommonTypes.FilActorId.wrap(owner);
        AccountAPI.authenticateMessage(
            ownerActorId,
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