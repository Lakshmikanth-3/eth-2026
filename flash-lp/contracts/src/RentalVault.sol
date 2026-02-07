// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RentalVault
 * @notice Manages LP position NFT deposits, listings, and rental locks
 */
contract RentalVault is IERC721Receiver, Ownable, ReentrancyGuard, Pausable {
    
    struct Position {
        address owner;
        address nftContract;
        uint256 tokenId;
        uint256 pricePerSecond;
        bool isListed;
        bool isLocked;
        uint256 minRentalDuration;
        uint256 maxRentalDuration;
    }
    
    mapping(bytes32 => Position) public positions;
    mapping(address => bytes32[]) private ownerPositions;
    uint256 public totalPositions;
    
    /* ================= EVENTS ================= */

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

    event PositionUnlisted(bytes32 indexed positionId);

    event PositionWithdrawn(
        bytes32 indexed positionId,
        address indexed owner
    );

    event PositionLocked(bytes32 indexed positionId);
    event PositionUnlocked(bytes32 indexed positionId);

    /* ================= ERRORS ================= */

    error PositionNotFound();
    error PositionIsLocked(); // ✅ FIXED
    error Unauthorized();
    error AlreadyListed();
    error NotListed();
    error InvalidPrice();
    error InvalidDuration();
    error ZeroAddress();

    constructor() Ownable(msg.sender) {}

    /* ================= CORE LOGIC ================= */

    function depositPosition(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant whenNotPaused returns (bytes32 positionId) {
        if (nftContract == address(0)) revert ZeroAddress();

        IERC721(nftContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );

        positionId = keccak256(
            abi.encodePacked(msg.sender, nftContract, tokenId, block.timestamp, totalPositions)
        );

        positions[positionId] = Position({
            owner: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            pricePerSecond: 0,
            isListed: false,
            isLocked: false,
            minRentalDuration: 0,
            maxRentalDuration: 0
        });

        ownerPositions[msg.sender].push(positionId);
        totalPositions++;

        emit PositionDeposited(positionId, msg.sender, nftContract, tokenId);
    }

    function listPosition(
        bytes32 positionId,
        uint256 pricePerSecond,
        uint256 minDuration,
        uint256 maxDuration
    ) external nonReentrant {
        Position storage position = positions[positionId];

        if (position.owner != msg.sender) revert Unauthorized();
        if (position.isLocked) revert PositionIsLocked(); // ✅ FIXED
        if (position.isListed) revert AlreadyListed();
        if (pricePerSecond == 0) revert InvalidPrice();
        if (minDuration == 0 || maxDuration < minDuration) revert InvalidDuration();

        position.pricePerSecond = pricePerSecond;
        position.minRentalDuration = minDuration;
        position.maxRentalDuration = maxDuration;
        position.isListed = true;

        emit PositionListed(positionId, pricePerSecond, minDuration, maxDuration);
    }

    function unlistPosition(bytes32 positionId) external nonReentrant {
        Position storage position = positions[positionId];

        if (position.owner != msg.sender) revert Unauthorized();
        if (position.isLocked) revert PositionIsLocked(); // ✅ FIXED
        if (!position.isListed) revert NotListed();

        position.isListed = false;
        emit PositionUnlisted(positionId);
    }

    function withdrawPosition(bytes32 positionId) external nonReentrant {
        Position storage position = positions[positionId];

        if (position.owner != msg.sender) revert Unauthorized();
        if (position.isLocked) revert PositionIsLocked(); // ✅ FIXED

        IERC721(position.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            position.tokenId
        );

        _removeFromOwnerPositions(msg.sender, positionId);
        delete positions[positionId];
        totalPositions--;

        emit PositionWithdrawn(positionId, msg.sender);
    }

    function lockPosition(bytes32 positionId) external onlyOwner {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound();

        position.isLocked = true;
        emit PositionLocked(positionId);
    }

    function unlockPosition(bytes32 positionId) external onlyOwner {
        Position storage position = positions[positionId];
        if (position.owner == address(0)) revert PositionNotFound();

        position.isLocked = false;
        emit PositionUnlocked(positionId);
    }
    
    /**
 * @notice Get full details of a position
 * @param positionId ID of the position
 * @return Position struct
 */
function getPosition(bytes32 positionId)
    external
    view
    returns (Position memory)
{
    Position memory position = positions[positionId];
    if (position.owner == address(0)) revert PositionNotFound();
    return position;
}


    function getOwnerPositions(address owner)
        external
        view
        returns (bytes32[] memory)
    {
        return ownerPositions[owner];
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _removeFromOwnerPositions(address owner, bytes32 positionId) private {
        bytes32[] storage arr = ownerPositions[owner];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == positionId) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
    }
}
