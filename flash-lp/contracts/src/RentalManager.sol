// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RentalManager
 * @notice Manages LP position rentals with time-based access and collateral
 * @dev Handles rental creation, settlement, extensions, and emergency closures
 */
contract RentalManager is Ownable, ReentrancyGuard, Pausable {
    
    /// @notice Rental state for each position
    struct RentalState {
        address originalOwner;      // LP who owns the position
        address currentRenter;      // Protocol renting the position
        uint256 startTime;          // Unix timestamp when rental started
        uint256 endTime;            // Unix timestamp when rental ends
        uint256 pricePerSecond;     // Wei per second rental cost
        uint256 collateralAmount;   // Collateral deposited by renter
        bool isActive;              // Whether rental is currently active
        bytes32 channelId;          // Yellow Network channel ID
        bytes32 positionId;         // Position being rented
    }
    
    /// @notice Mapping from rental ID to rental state
    mapping(bytes32 => RentalState) public rentals;
    
    /// @notice Mapping from position to active rental ID
    mapping(bytes32 => bytes32) public positionToRental;
    
    /// @notice Mapping from renter to their rental IDs
    mapping(address => bytes32[]) private renterRentals;
    
    /// @notice Yellow Channel Manager contract
    address public yellowChannelManager;
    
    /// @notice Rental Vault contract
    address public rentalVault;
    
    /// @notice Platform fee (basis points, e.g., 200 = 2%)
    uint256 public platformFeeBps = 200;
    
    /// @notice Minimum collateral percentage (120% = 12000 basis points)
    uint256 public minCollateralBps = 12000;
    
    /// @notice Minimum rental duration (1 hour)
    uint256 public constant MIN_RENTAL_DURATION = 1 hours;
    
    /// @notice Maximum rental duration (7 days)
    uint256 public constant MAX_RENTAL_DURATION = 7 days;
    
    /// @notice Maximum platform fee (5%)
    uint256 public constant MAX_PLATFORM_FEE = 500;
    
    /// @notice Total rentals created
    uint256 public totalRentals;
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Events
    event RentalCreated(
        bytes32 indexed rentalId,
        bytes32 indexed positionId,
        address indexed renter,
        address owner,
        uint256 duration,
        uint256 pricePerSecond,
        uint256 collateral
    );
    
    event RentalEnded(
        bytes32 indexed rentalId,
        uint256 totalFee,
        uint256 actualDuration,
        uint256 refund
    );
    
    event RentalExtended(
        bytes32 indexed rentalId,
        uint256 newEndTime,
        uint256 additionalCollateral
    );
    
    event EmergencyClose(
        bytes32 indexed rentalId,
        address indexed closer,
        uint256 penalty
    );
    
    event PlatformFeeUpdated(uint256 newFeeBps);
    event CollateralRequirementUpdated(uint256 newBps);
    
    /// @notice Custom errors
    error InvalidDuration();
    error InsufficientCollateral();
    error NoActiveChannel();
    error RentalNotFound();
    error RentalStillActive();
    error Unauthorized();
    error InvalidPrice();
    error RentalExpired();
    error PositionAlreadyRented();
    error InvalidFee();
    error InvalidCollateralBps();
    error ZeroAddress();
    
    constructor(
        address _yellowChannelManager,
        address _rentalVault
    ) Ownable(msg.sender) {
        if (_yellowChannelManager == address(0) || _rentalVault == address(0)) {
            revert ZeroAddress();
        }
        yellowChannelManager = _yellowChannelManager;
        rentalVault = _rentalVault;
    }
    
    /**
     * @notice Create a new rental
     * @param positionId ID of the position to rent
     * @param owner Address of the position owner
     * @param duration Rental duration in seconds
     * @param pricePerSecond Rental price in wei per second
     * @param channelId Yellow Network channel ID
     * @return rentalId Unique identifier for the rental
     */
    function createRental(
        bytes32 positionId,
        address owner,
        uint256 duration,
        uint256 pricePerSecond,
        bytes32 channelId
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused
        returns (bytes32 rentalId) 
    {
        // Validate inputs
        if (duration < MIN_RENTAL_DURATION || duration > MAX_RENTAL_DURATION) {
            revert InvalidDuration();
        }
        if (pricePerSecond == 0) revert InvalidPrice();
        if (owner == address(0)) revert ZeroAddress();
        
        // Check position not already rented
        if (positionToRental[positionId] != bytes32(0)) {
            revert PositionAlreadyRented();
        }
        
        // Calculate required collateral (e.g., 120% of total cost)
        uint256 totalCost = duration * pricePerSecond;
        uint256 requiredCollateral = (totalCost * minCollateralBps) / 10000;
        
        if (msg.value < requiredCollateral) {
            revert InsufficientCollateral();
        }
        
        // Generate rental ID
        rentalId = keccak256(abi.encodePacked(
            msg.sender,
            positionId,
            block.timestamp,
            totalRentals
        ));
        
        // Store rental state
        rentals[rentalId] = RentalState({
            originalOwner: owner,
            currentRenter: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            pricePerSecond: pricePerSecond,
            collateralAmount: msg.value,
            isActive: true,
            channelId: channelId,
            positionId: positionId
        });
        
        // Map position to rental
        positionToRental[positionId] = rentalId;
        
        // Track renter's rentals
        renterRentals[msg.sender].push(rentalId);
        
        totalRentals++;
        
        emit RentalCreated(
            rentalId,
            positionId,
            msg.sender,
            owner,
            duration,
            pricePerSecond,
            msg.value
        );
    }
    
    /**
     * @notice End a rental and settle payments
     * @param rentalId ID of the rental to end
     */
    function endRental(bytes32 rentalId) external nonReentrant {
        RentalState storage rental = rentals[rentalId];
        
        if (!rental.isActive) revert RentalNotFound();
        
        // Only owner can force end before expiry, anyone can end after expiry
        if (block.timestamp < rental.endTime && msg.sender != rental.originalOwner) {
            revert RentalStillActive();
        }
        
        // Calculate actual fees
        uint256 actualDuration = block.timestamp > rental.endTime 
            ? rental.endTime - rental.startTime 
            : block.timestamp - rental.startTime;
        uint256 totalFee = actualDuration * rental.pricePerSecond;
        
        // Calculate platform fee
        uint256 platformFee = (totalFee * platformFeeBps) / 10000;
        uint256 ownerFee = totalFee - platformFee;
        
        // Calculate refund (collateral - total fee)
        uint256 refund = rental.collateralAmount > totalFee 
            ? rental.collateralAmount - totalFee 
            : 0;
        
        // Mark as inactive
        rental.isActive = false;
        
        // Clear position mapping
        delete positionToRental[rental.positionId];
        
        // Transfer fees
        (bool ownerSuccess, ) = payable(rental.originalOwner).call{value: ownerFee}("");
        require(ownerSuccess, "Owner transfer failed");
        
        (bool platformSuccess, ) = payable(owner()).call{value: platformFee}("");
        require(platformSuccess, "Platform transfer failed");
        
        totalFeesCollected += platformFee;
        
        // Refund excess collateral
        if (refund > 0) {
            (bool refundSuccess, ) = payable(rental.currentRenter).call{value: refund}("");
            require(refundSuccess, "Refund transfer failed");
        }
        
        emit RentalEnded(rentalId, totalFee, actualDuration, refund);
    }
    
    /**
     * @notice Extend an active rental
     * @param rentalId ID of the rental to extend
     * @param additionalDuration Additional duration in seconds
     */
    function extendRental(
        bytes32 rentalId, 
        uint256 additionalDuration
    ) external payable nonReentrant {
        RentalState storage rental = rentals[rentalId];
        
        if (!rental.isActive) revert RentalNotFound();
        if (msg.sender != rental.currentRenter) revert Unauthorized();
        if (block.timestamp >= rental.endTime) revert RentalExpired();
        
        // Validate new total duration
        uint256 newTotalDuration = (rental.endTime - rental.startTime) + additionalDuration;
        if (newTotalDuration > MAX_RENTAL_DURATION) revert InvalidDuration();
        
        // Calculate additional cost
        uint256 additionalCost = additionalDuration * rental.pricePerSecond;
        uint256 requiredCollateral = (additionalCost * minCollateralBps) / 10000;
        
        if (msg.value < requiredCollateral) revert InsufficientCollateral();
        
        // Update rental
        rental.endTime += additionalDuration;
        rental.collateralAmount += msg.value;
        
        emit RentalExtended(rentalId, rental.endTime, msg.value);
    }
    
    /**
     * @notice Emergency close by owner with penalty
     * @param rentalId ID of the rental to close
     */
    function emergencyClose(bytes32 rentalId) external nonReentrant {
        RentalState storage rental = rentals[rentalId];
        
        if (!rental.isActive) revert RentalNotFound();
        if (msg.sender != rental.originalOwner) revert Unauthorized();
        
        // Calculate penalty (10% of remaining value)
        uint256 remainingDuration = rental.endTime > block.timestamp 
            ? rental.endTime - block.timestamp 
            : 0;
        uint256 remainingValue = remainingDuration * rental.pricePerSecond;
        uint256 penalty = (remainingValue * 1000) / 10000; // 10%
        
        // Deduct penalty from collateral, refund  rest to renter
        uint256 refund = rental.collateralAmount > penalty 
            ? rental.collateralAmount - penalty 
            : 0;
        
        rental.isActive = false;
        delete positionToRental[rental.positionId];
        
        if (refund > 0) {
            (bool success, ) = payable(rental.currentRenter).call{value: refund}("");
            require(success, "Refund transfer failed");
        }
        
        // Owner receives penalty
        if (penalty > 0) {
            (bool success, ) = payable(rental.originalOwner).call{value: penalty}("");
            require(success, "Penalty transfer failed");
        }
        
        emit EmergencyClose(rentalId, msg.sender, penalty);
    }
    
    /**
     * @notice Get rental details
     * @param rentalId ID of the rental
     * @return Rental state struct
     */
    function getRental(bytes32 rentalId) 
        external 
        view 
        returns (RentalState memory) 
    {
        return rentals[rentalId];
    }
    
    /**
     * @notice Calculate current fees for active rental
     * @param rentalId ID of the rental
     * @return Current fee amount
     */
    function calculateCurrentFees(bytes32 rentalId) 
        external 
        view 
        returns (uint256) 
    {
        RentalState memory rental = rentals[rentalId];
        if (!rental.isActive) return 0;
        
        uint256 elapsed = block.timestamp - rental.startTime;
        if (elapsed > (rental.endTime - rental.startTime)) {
            elapsed = rental.endTime - rental.startTime;
        }
        
        return elapsed * rental.pricePerSecond;
    }
    
    /**
     * @notice Get all rentals for a renter
     * @param renter Address of the renter
     * @return Array of rental IDs
     */
    function getRenterRentals(address renter) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return renterRentals[renter];
    }
    
    /**
     * @notice Admin: Update platform fee
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_PLATFORM_FEE) revert InvalidFee();
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }
    
    /**
     * @notice Admin: Update collateral requirement
     * @param newBps New collateral percentage in basis points
     */
    function setMinCollateral(uint256 newBps) external onlyOwner {
        if (newBps < 10000 || newBps > 20000) revert InvalidCollateralBps();
        minCollateralBps = newBps;
        emit CollateralRequirementUpdated(newBps);
    }
    
    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
