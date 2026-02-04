// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RentalVault.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title MockNFT
 * @notice Mock NFT for testing
 */
contract MockNFT is ERC721 {
    uint256 private _tokenIds;
    
    constructor() ERC721("Mock Position", "MPOS") {}
    
    function mint(address to) external returns (uint256) {
        _tokenIds++;
        _mint(to, _tokenIds);
        return _tokenIds;
    }
}

/**
 * @title RentalVaultTest
 * @notice Comprehensive tests for RentalVault contract
 */
contract RentalVaultTest is Test {
    RentalVault public vault;
    MockNFT public nft;
    
    address public owner;
    address public alice;
    address public bob;
    
    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        
        // Deploy contracts
        vault = new RentalVault();
        nft = new MockNFT();
        
        // Give alice some ETH
        vm.deal(alice, 100 ether);
    }
    
    function testDepositPosition() public {
        // Mint NFT to Alice
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        
        // Approve vault
        nft.approve(address(vault), tokenId);
        
        // Deposit
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        
        // Verify
        RentalVault.Position memory position = vault.getPosition(positionId);
        assertEq(position.owner, alice);
        assertEq(position.nftContract, address(nft));
        assertEq(position.tokenId, tokenId);
        assertFalse(position.isListed);
        assertFalse(position.isLocked);
        
        vm.stopPrank();
    }
    
    function testListPosition() public {
        // Setup: Deposit position
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        
        // List position
        uint256 pricePerSecond = 277777777777777; // ~1 ETH per hour (integer)
        uint256 minDuration = 1 hours;
        uint256 maxDuration = 7 days;
        
        vault.listPosition(positionId, pricePerSecond, minDuration, maxDuration);
        
        // Verify
        RentalVault.Position memory position = vault.getPosition(positionId);
        assertTrue(position.isListed);
        assertEq(position.pricePerSecond, pricePerSecond);
        assertEq(position.minRentalDuration, minDuration);
        assertEq(position.maxRentalDuration, maxDuration);
        
        vm.stopPrank();
    }
    
    function testCannotListInvalidPrice() public {
        // Setup
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        
        // Attempt to list with 0 price
        vm.expectRevert(RentalVault.InvalidPrice.selector);
        vault.listPosition(positionId, 0, 1 hours, 7 days);
        
        vm.stopPrank();
    }
    
    function testWithdrawPosition() public {
        // Setup
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        
        // Withdraw
        vault.withdrawPosition(positionId);
        
        // Verify NFT returned
        assertEq(nft.ownerOf(tokenId), alice);
        
        vm.stopPrank();
    }
    
    function testCannotWithdrawLockedPosition() public {
        // Setup
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        vm.stopPrank();
        
        // Lock position (as owner)
        vault.lockPosition(positionId);
        
        // Attempt withdrawal
        vm.startPrank(alice);
        vm.expectRevert(RentalVault.PositionIsLocked.selector);
        vault.withdrawPosition(positionId);
        vm.stopPrank();
    }
    
    function testUnauthorizedCannotList() public {
        // Setup
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        vm.stopPrank();
        
        // Bob tries to list Alice's position
        vm.startPrank(bob);
        vm.expectRevert(RentalVault.Unauthorized.selector);
        vault.listPosition(positionId, 1 ether, 1 hours, 7 days);
        vm.stopPrank();
    }
    
    function testPauseUnpause() public {
        // Pause
        vault.pause();
        
        // Attempt deposit while paused
        vm.startPrank(alice);
        uint256 tokenId = nft.mint(alice);
        nft.approve(address(vault), tokenId);
        
        vm.expectRevert();
        vault.depositPosition(address(nft), tokenId);
        
        vm.stopPrank();
        
        // Unpause
        vault.unpause();
        
        // Now should work
        vm.startPrank(alice);
        bytes32 positionId = vault.depositPosition(address(nft), tokenId);
        assertNotEq(positionId, bytes32(0));
        vm.stopPrank();
    }
}
