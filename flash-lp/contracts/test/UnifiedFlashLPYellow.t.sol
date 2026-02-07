// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/UnifiedFlashLP.sol";
import "../src/YellowChannelManager.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 ether);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract UnifiedFlashLPYellowTest is Test {
    UnifiedFlashLP public flashLP;
    YellowChannelManager public yellowManager;
    MockERC20 public token0;
    MockERC20 public token1;
    
    address public poolOwner = address(0x1);
    address public renter = address(0x2);
    
    function setUp() public {
        // Deploy contracts
        yellowManager = new YellowChannelManager();
        flashLP = new UnifiedFlashLP(address(yellowManager));
        
        // Deploy mock tokens
        token0 = new MockERC20();
        token1 = new MockERC20();
        
        // Fund accounts
        vm.deal(poolOwner, 100 ether);
        vm.deal(renter, 100 ether);
        
        token0.mint(poolOwner, 1000 ether);
        token1.mint(poolOwner, 1000 ether);
    }
    
    function testRentWithYellowChannel() public {
        // Create pool
        vm.startPrank(poolOwner);
        token0.approve(address(flashLP), 100 ether);
        token1.approve(address(flashLP), 100 ether);
        uint256 poolId = flashLP.createPool(
            address(token0),
            address(token1),
            100 ether,
            100 ether
        );
        vm.stopPrank();
        
        // Create Yellow channel first
        vm.prank(renter);
        bytes32 channelId = yellowManager.createRentalChannel{value: 5 ether}(
            1, // rentalId (we'll use for rental)
            renter,
            poolOwner,
            1 hours
        );
        
        // Rent pool with channel ID
        uint256 duration = 1 hours;
        uint256 pricePerSecond = 0.00001 ether;
        uint256 cost = duration * pricePerSecond;
        uint256 collateral = (cost * 12000) / 10000;
        
        vm.prank(renter);
        uint256 rentalId = flashLP.rentPool{value: collateral}(
            poolId,
            duration,
            pricePerSecond,
            channelId
        );
        
        // Verify rental has channel ID
        UnifiedFlashLP.Rental memory rental = flashLP.getRental(rentalId);
        assertEq(rental.channelId, channelId);
        assertTrue(rental.isActive);
    }
    
    function testSettleRentalWithYellow() public {
        // Setup pool and rental
        vm.startPrank(poolOwner);
        token0.approve(address(flashLP), 100 ether);
        token1.approve(address(flashLP), 100 ether);
        uint256 poolId = flashLP.createPool(
            address(token0),
            address(token1),
            100 ether,
            100 ether
        );
        vm.stopPrank();
        
        uint256 rentalId = 1;
        
        // Create Yellow channel
        vm.prank(renter);
        bytes32 channelId = yellowManager.createRentalChannel{value: 5 ether}(
            rentalId,
            renter,
            poolOwner,
            1 hours
        );
        
        // Rent pool
        vm.prank(renter);
        flashLP.rentPool{value: 5 ether}(
            poolId,
            1 hours,
            0.00001 ether,
            channelId
        );
        
        // Simulate some time passing and fees accruing
        vm.warp(block.timestamp + 30 minutes);
        
        // Prepare final balances (renter keeps 3 ETH, owner gets 2 ETH in fees)
        uint256 finalBalance1 = 3 ether;
        uint256 finalBalance2 = 2 ether;
        uint256 nonce = 10;
        
        // Sign final state
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
        
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(2, ethSignedHash); // renter
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(1, ethSignedHash); // owner
        
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);
        
        uint256 ownerBalanceBefore = poolOwner.balance;
        uint256 renterBalanceBefore = renter.balance;
        
        // Settle rental
        vm.prank(renter);
        flashLP.settleRentalWithYellow(
            rentalId,
            finalBalance1,
            finalBalance2,
            nonce,
            sig1,
            sig2
        );
        
        // Verify rental is inactive
        UnifiedFlashLP.Rental memory rental = flashLP.getRental(rentalId);
        assertFalse(rental.isActive);
        
        // Verify Yellow channel is closed
        YellowChannelManager.Channel memory channel = yellowManager.getChannel(channelId);
        assertFalse(channel.isActive);
        
        // Verify balances transferred (minus platform fee)
        uint256 platformFee = (finalBalance2 * 200) / 10000; // 2% platform fee
        uint256 ownerAmount = finalBalance2 - platformFee;
        
        assertEq(poolOwner.balance, ownerBalanceBefore + ownerAmount);
        assertEq(renter.balance, renterBalanceBefore + finalBalance1);
    }
    
    function testCannotSettleWithoutYellowChannel() public {
        vm.startPrank(poolOwner);
        token0.approve(address(flashLP), 100 ether);
        token1.approve(address(flashLP), 100 ether);
        uint256 poolId = flashLP.createPool(
            address(token0),
            address(token1),
            100 ether,
            100 ether
        );
        vm.stopPrank();
        
        // Rent without Yellow channel
        vm.prank(renter);
        uint256 rentalId = flashLP.rentPool{value: 5 ether}(
            poolId,
            1 hours,
            0.00001 ether,
            bytes32(0) // No channel ID
        );
        
        // Try to settle - should revert
        vm.prank(renter);
        vm.expectRevert("No Yellow channel");
        flashLP.settleRentalWithYellow(
            rentalId,
            3 ether,
            2 ether,
            1,
            "",
            ""
        );
    }
}
