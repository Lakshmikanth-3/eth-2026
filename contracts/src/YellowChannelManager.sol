// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title YellowChannelManager
 * @notice Manages Yellow Network state channels for off-chain payment updates
 * @dev Implements payment channel pattern with signature verification
 */
contract YellowChannelManager is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    /// @notice Channel state
    struct Channel {
        address participant1;       // Renter
        address participant2;       // LP owner
        uint256 balance1;           // Renter's balance
        uint256 balance2;           // LP's balance
        uint256 totalDeposit;       // Total deposited
        uint256 nonce;              // State update nonce
        uint256 timeout;            // Challenge timeout
        uint256 expiresAt;          // Channel expiration
        bool isActive;              // Channel status
        bool isDisputed;            // In dispute
    }
    
    /// @notice Mapping from channel ID to channel data  
    mapping(bytes32 => Channel) public channels;
    
    /// @notice Mapping from participant to their channel IDs
    mapping(address => bytes32[]) private participantChannels;
    
    /// @notice Dispute timeout (24 hours)
    uint256 public constant DISPUTE_TIMEOUT = 24 hours;
    
    /// @notice Total channels created
    uint256 public totalChannels;
    
    ///Events
    event ChannelOpened(
        bytes32 indexed channelId,
        address indexed participant1,
        address indexed participant2,
        uint256 deposit,
        uint256 expiresAt
    );
    
    event ChannelUpdated(
        bytes32 indexed channelId,
        uint256 balance1,
        uint256 balance2,
        uint256 nonce
    );
    
    event ChannelClosed(
        bytes32 indexed channelId,
        uint256 finalBalance1,
        uint256 finalBalance2
    );
    
    event DisputeStarted(
        bytes32 indexed channelId,
        address indexed initiator,
        uint256 timeout
    );
    
    event DisputeResolved(
        bytes32 indexed channelId,
        bool success
    );
    
    /// @notice Custom errors
    error ChannelNotFound();
    error ChannelNotActive();
    error Unauthorized();
    error InvalidSignature();
    error InvalidNonce();
    error DisputeNotResolved();
    error ChannelExpired();
    error InsufficientDeposit();
    error InvalidBalances();
    error ZeroAddress();
    error InvalidDuration();
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Open a new payment channel
     * @param participant2 Address of the second participant
     * @param duration Channel duration in seconds
     * @return channelId Unique identifier for the channel
     */
    function openChannel(
        address participant2,
        uint256 duration
    ) external payable nonReentrant returns (bytes32 channelId) {
        if (msg.value == 0) revert InsufficientDeposit();
        if (participant2 == address(0)) revert ZeroAddress();
        if (duration == 0) revert InvalidDuration();
        
        channelId = keccak256(abi.encodePacked(
            msg.sender,
            participant2,
            block.timestamp,
            totalChannels
        ));
        
        channels[channelId] = Channel({
            participant1: msg.sender,
            participant2: participant2,
            balance1: msg.value,
            balance2: 0,
            totalDeposit: msg.value,
            nonce: 0,
            timeout: 0,
            expiresAt: block.timestamp + duration,
            isActive: true,
            isDisputed: false
        });
        
        participantChannels[msg.sender].push(channelId);
        participantChannels[participant2].push(channelId);
        totalChannels++;
        
        emit ChannelOpened(
            channelId,
            msg.sender,
            participant2,
            msg.value,
            block.timestamp + duration
        );
    }
    
    /**
     * @notice Update channel state with off-chain balance updates
     * @param channelId ID of the channel
     * @param newBalance1 New balance for participant 1
     * @param newBalance2 New balance for participant 2
     * @param nonce State update nonce
     * @param signature1 Signature from participant 1
     * @param signature2 Signature from participant 2
     */
    function updateChannel(
        bytes32 channelId,
        uint256 newBalance1,
        uint256 newBalance2,
        uint256 nonce,
        bytes calldata signature1,
        bytes calldata signature2
    ) external nonReentrant {
        Channel storage channel = channels[channelId];
        
        if (!channel.isActive) revert ChannelNotActive();
        if (nonce <= channel.nonce) revert InvalidNonce();
        if (block.timestamp > channel.expiresAt) revert ChannelExpired();
        
        // Verify balances sum to total deposit
        if (newBalance1 + newBalance2 != channel.totalDeposit) {
            revert InvalidBalances();
        }
        
        // Create message hash
        bytes32 messageHash = keccak256(abi.encodePacked(
            channelId,
            newBalance1,
            newBalance2,
            nonce
        )).toEthSignedMessageHash();
        
        // Verify signatures
        address signer1 = messageHash.recover(signature1);
        address signer2 = messageHash.recover(signature2);
        
        if (signer1 != channel.participant1 || signer2 != channel.participant2) {
            revert InvalidSignature();
        }
        
        // Update state
        channel.balance1 = newBalance1;
        channel.balance2 = newBalance2;
        channel.nonce = nonce;
        
        emit ChannelUpdated(channelId, newBalance1, newBalance2, nonce);
    }
    
    /**
     * @notice Close channel cooperatively
     * @param channelId ID of the channel
     * @param finalBalance1 Final balance for participant 1
     * @param finalBalance2 Final balance for participant 2
     * @param nonce Final nonce
     * @param signature1 Signature from participant 1
     * @param signature2 Signature from participant 2
     */
    function closeChannel(
        bytes32 channelId,
        uint256 finalBalance1,
        uint256 finalBalance2,
        uint256 nonce,
        bytes calldata signature1,
        bytes calldata signature2
    ) external nonReentrant {
        Channel storage channel = channels[channelId];
        
        if (!channel.isActive) revert ChannelNotActive();
        if (channel.isDisputed) revert DisputeNotResolved();
        
        // Verify final balances
        if (finalBalance1 + finalBalance2 != channel.totalDeposit) {
            revert InvalidBalances();
        }
        
        // Verify signatures
        bytes32 messageHash = keccak256(abi.encodePacked(
            channelId,
            finalBalance1,
            finalBalance2,
            nonce,
            "close"
        )).toEthSignedMessageHash();
        
        address signer1 = messageHash.recover(signature1);
        address signer2 = messageHash.recover(signature2);
        
        if (signer1 != channel.participant1 || signer2 != channel.participant2) {
            revert InvalidSignature();
        }
        
        // Mark as inactive
        channel.isActive = false;
        
        // Transfer final balances
        if (finalBalance1 > 0) {
            (bool success, ) = payable(channel.participant1).call{value: finalBalance1}("");
            require(success, "Transfer to participant1 failed");
        }
        if (finalBalance2 > 0) {
            (bool success, ) = payable(channel.participant2).call{value: finalBalance2}("");
            require(success, "Transfer to participant2 failed");
        }
        
        emit ChannelClosed(channelId, finalBalance1, finalBalance2);
    }
    
    /**
     * @notice Start dispute process
     * @param channelId ID of the channel
     */
    function startDispute(bytes32 channelId) external {
        Channel storage channel = channels[channelId];
        
        if (!channel.isActive) revert ChannelNotActive();
        if (msg.sender != channel.participant1 && msg.sender != channel.participant2) {
            revert Unauthorized();
        }
        
        channel.isDisputed = true;
        channel.timeout = block.timestamp + DISPUTE_TIMEOUT;
        
        emit DisputeStarted(channelId, msg.sender, channel.timeout);
    }
    
    /**
     * @notice Resolve dispute (admin function)
     * @param channelId ID of the channel
     * @param finalBalance1 Final balance for participant 1
     * @param finalBalance2 Final balance for participant 2
     */
    function resolveDispute(
        bytes32 channelId,
        uint256 finalBalance1,
        uint256 finalBalance2
    ) external onlyOwner {
        Channel storage channel = channels[channelId];
        
        if (!channel.isDisputed) revert ChannelNotFound();
        require(block.timestamp >= channel.timeout, "Timeout not reached");
        
        // Verify balances
        if (finalBalance1 + finalBalance2 != channel.totalDeposit) {
            revert InvalidBalances();
        }
        
        // Mark as inactive
        channel.isActive = false;
        channel.isDisputed = false;
        
        // Transfer balances
        if (finalBalance1 > 0) {
            (bool success, ) = payable(channel.participant1).call{value: finalBalance1}("");
            require(success, "Transfer to participant1 failed");
        }
        if (finalBalance2 > 0) {
            (bool success, ) = payable(channel.participant2).call{value: finalBalance2}("");
            require(success, "Transfer to participant2 failed");
        }
        
        emit DisputeResolved(channelId, true);
        emit ChannelClosed(channelId, finalBalance1, finalBalance2);
    }
    
    /**
     * @notice Check if participant has active channels
     * @param participant Address to check
     * @return Whether participant has active channels
     */
    function hasActiveChannel(address participant) 
        external 
        view 
        returns (bool) 
    {
        bytes32[] memory userChannels = participantChannels[participant];
        for (uint256 i = 0; i < userChannels.length; i++) {
            if (channels[userChannels[i]].isActive) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Get channel details
     * @param channelId ID of the channel
     * @return Channel struct
     */
    function getChannel(bytes32 channelId) 
        external 
        view 
        returns (Channel memory) 
    {
        return channels[channelId];
    }
    
    /**
     * @notice Get all channels for a participant
     * @param participant Address of the participant
     * @return Array of channel IDs
     */
    function getParticipantChannels(address participant) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return participantChannels[participant];
    }
}
