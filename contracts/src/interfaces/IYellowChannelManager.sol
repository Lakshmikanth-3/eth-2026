// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYellowChannelManager
 * @notice Interface for Yellow Network state channel management
 */
interface IYellowChannelManager {
    struct Channel {
        address participant1;
        address participant2;
        uint256 balance1;
        uint256 balance2;
        uint256 totalDeposit;
        uint256 nonce;
        uint256 timeout;
        uint256 expiresAt;
        bool isActive;
        bool isDisputed;
    }
    
    event ChannelOpened(bytes32 indexed channelId, address indexed participant1, address indexed participant2, uint256 deposit, uint256 expiresAt);
    event ChannelClosed(bytes32 indexed channelId, uint256 finalBalance1, uint256 finalBalance2);
    
    function openChannel(address participant2, uint256 duration) external payable returns (bytes32 channelId);
    function closeChannel(bytes32 channelId, uint256 finalBalance1, uint256 finalBalance2, uint256 nonce, bytes calldata signature1, bytes calldata signature2) external;
    function getChannel(bytes32 channelId) external view returns (Channel memory);
    function hasActiveChannel(address participant) external view returns (bool);
}
