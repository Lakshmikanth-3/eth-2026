// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/YellowChannelManager.sol";

contract YellowChannelManagerTest is Test {
    YellowChannelManager public manager;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    event ChannelOpened(
        bytes32 indexed channelId,
        address indexed participant1,
        address indexed participant2,
        uint256 deposit,
        uint256 expiresAt
    );
    
    event ChannelClosed(
        bytes32 indexed channelId,
        uint256 finalBalance1,
        uint256 finalBalance2
    );
    
    function setUp() public {
        manager = new YellowChannelManager();
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }
    
    function testCreateRentalChannel() public {
        uint256 rentalId = 1;
        uint256 deposit = 1 ether;
        uint256 duration = 1 hours;
        
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: deposit}(
            rentalId,
            alice,
            bob,
            duration
        );
        
        assertNotEq(channelId, bytes32(0), "Channel ID should not be zero");
        
        // Verify channel was created
        YellowChannelManager.Channel memory channel = manager.getChannel(channelId);
        assertEq(channel.participant1, alice);
        assertEq(channel.participant2, bob);
        assertEq(channel.balance1, deposit);
        assertEq(channel.balance2, 0);
        assertEq(channel.totalDeposit, deposit);
        assertTrue(channel.isActive);
        
        // Verify rental mapping
        assertEq(manager.getRentalChannel(rentalId), channelId);
    }
    
    function testCannotCreateDuplicateRentalChannel() public {
        uint256 rentalId = 1;
        
        vm.startPrank(alice);
        manager.createRentalChannel{value: 1 ether}(rentalId, alice, bob, 1 hours);
        
        // Try to create again - should revert
        vm.expectRevert("Rental channel exists");
        manager.createRentalChannel{value: 1 ether}(rentalId, alice, bob, 1 hours);
        vm.stopPrank();
    }
    
    function testUpdateChannel() public {
        // Create channel
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: 1 ether}(
            1,
            alice,
            bob,  
            1 hours
        );
        
        // Prepare state update
        uint256 newBalance1 = 0.7 ether;
        uint256 newBalance2 = 0.3 ether;
        uint256 nonce = 1;
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            channelId,
            newBalance1,
            newBalance2,
            nonce
        ));
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        // Sign with both parties
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(1, ethSignedHash); // alice's key
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(2, ethSignedHash); // bob's key
        
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);
        
        // Update channel
        manager.updateChannel(
            channelId,
            newBalance1,
            newBalance2,
            nonce,
            sig1,
            sig2
        );
        
        // Verify update
        YellowChannelManager.Channel memory channel = manager.getChannel(channelId);
        assertEq(channel.balance1, newBalance1);
        assertEq(channel.balance2, newBalance2);
        assertEq(channel.nonce, nonce);
    }
    
    function testCloseChannel() public {
        // Create channel
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: 1 ether}(
            1,
            alice,
            bob,
            1 hours
        );
        
        // Prepare final state
        uint256 finalBalance1 = 0.6 ether;
        uint256 finalBalance2 = 0.4 ether;
        uint256 nonce = 5;
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            channelId,
            finalBalance1,
            finalBalance2,
            nonce,
            "close"
        ));
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(1, ethSignedHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(2, ethSignedHash);
        
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);
        
        uint256 aliceBalanceBefore = alice.balance;
        uint256 bobBalanceBefore = bob.balance;
        
        // Close channel
        vm.expectEmit(true, true, true, true);
        emit ChannelClosed(channelId, finalBalance1, finalBalance2);
        
        manager.closeChannel(
            channelId,
            finalBalance1,
            finalBalance2,
            nonce,
            sig1,
            sig2
        );
        
        // Verify channel is closed
        YellowChannelManager.Channel memory channel = manager.getChannel(channelId);
        assertFalse(channel.isActive);
        
        // Verify balances transferred
        assertEq(alice.balance, aliceBalanceBefore + finalBalance1);
        assertEq(bob.balance, bobBalanceBefore + finalBalance2);
    }
    
    function testStartDispute() public {
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: 1 ether}(
            1,
            alice,
            bob,
            1 hours
        );
        
        vm.prank(alice);
        manager.startDispute(channelId);
        
        YellowChannelManager.Channel memory channel = manager.getChannel(channelId);
        assertTrue(channel.isDisputed);
        assertGt(channel.timeout, block.timestamp);
    }
    
    function testResolveDispute() public {
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: 1 ether}(
            1,
            alice,
            bob,
            1 hours
        );
        
        vm.prank(alice);
        manager.startDispute(channelId);
        
        // Fast forward past timeout
        vm.warp(block.timestamp + 24 hours + 1);
        
        uint256 finalBalance1 = 0.5 ether;
        uint256 finalBalance2 = 0.5 ether;
        
        manager.resolveDispute(channelId, finalBalance1, finalBalance2);
        
        YellowChannelManager.Channel memory channel = manager.getChannel(channelId);
        assertFalse(channel.isActive);
        assertFalse(channel.isDisputed);
    }
    
    function testInvalidBalancesRevert() public {
        vm.prank(alice);
        bytes32 channelId = manager.createRentalChannel{value: 1 ether}(
            1,
            alice,
            bob,
            1 hours
        );
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            channelId,
            uint256(0.7 ether),
            uint256(0.4 ether), // Total = 1.1 ether != 1 ether
            uint256(1)
        ));
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(1, ethSignedHash);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(2, ethSignedHash);
        
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);
        
        vm.expectRevert(YellowChannelManager.InvalidBalances.selector);
        manager.updateChannel(
            channelId,
            0.7 ether,
            0.4 ether,
            1,
            sig1,
            sig2
        );
    }
}
