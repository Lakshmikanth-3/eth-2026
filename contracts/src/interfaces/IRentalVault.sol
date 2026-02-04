// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRentalVault
 * @notice Interface for the LP position vault
 */
interface IRentalVault {
    struct Position {
        address owner;
        address nftContract;
        uint256 tokenId;
        uint256 pricePerSecond;
        bool isListed;                // ✅ FIXED
        bool isLocked;
        uint256 minRentalDuration;
        uint256 maxRentalDuration;
    }
    
    event PositionDeposited(
        bytes32 indexed positionId,
        address indexed owner,
        address nftContract,
        uint256 tokenId
    );

    event PositionListed(
        bytes32 indexed positionId,
        uint256 pricePerSecond,
        uint256 minDuration,
        uint256 maxDuration
    );

    event PositionWithdrawn(
        bytes32 indexed positionId,
        address indexed owner
    );

    event PositionLocked(bytes32 indexed positionId);
    event PositionUnlocked(bytes32 indexed positionId);
    
    function depositPosition(
        address nftContract,
        uint256 tokenId
    ) external returns (bytes32 positionId);

    function listPosition(
        bytes32 positionId,
        uint256 pricePerSecond,
        uint256 minDuration,
        uint256 maxDuration
    ) external;

    function withdrawPosition(bytes32 positionId) external;

    function lockPosition(bytes32 positionId) external;

    function unlockPosition(bytes32 positionId) external;

    function getPosition(bytes32 positionId)
        external
        view
        returns (Position memory);
}
