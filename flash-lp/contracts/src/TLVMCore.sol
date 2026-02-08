// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./TemporalAMM.sol";
import "./PredictiveCommitment.sol";
import "./VirtualLiquidityManager.sol";

interface ITLVMCore {
    struct PredictiveCommitmentData {
        bool hasCommitment;
        bytes32 predictedUsage;
        bytes zkProof;
    }
}

/**
 * @title TLVMCore
 * @notice Core protocol for Temporal Liquidity Virtualization with Predictive State Commitment
 */
contract TLVMCore is ITLVMCore {
    
    // ============ State Variables ============
    
    TemporalAMM public immutable temporalAMM;
    PredictiveCommitment public immutable predictiveCommitment;
    VirtualLiquidityManager public immutable virtualLiquidity;
    
    // Rental registry
    mapping(bytes32 => Rental) public rentals;
    
    // Active rentals per user
    mapping(address => bytes32[]) public userRentals;
    
    // LP position registry
    mapping(uint256 => LPPosition) public lpPositions;
    
    // Protocol parameters
    uint256 public constant DECAY_RATE = 0.0001e18; // 0.01% per hour
    uint256 public constant MIN_RENTAL_DURATION = 300; // 5 minutes
    uint256 public constant MAX_RENTAL_DURATION = 604800; // 1 week
    uint256 public constant COLLATERAL_MULTIPLIER = 1.2e18; // 120%
    uint256 public constant PREDICTION_STAKE = 0.05e18; // 5% of rental cost
    
    // ============ Structs ============
    
    struct Rental {
        bytes32 id;
        address renter;
        address lpOwner;
        uint256 positionId;
        uint256 startTime;
        uint256 endTime;
        uint256 duration;
        uint256 liquidityAmount;
        uint256 basePricePerSecond;
        uint256 collateralAmount;
        bool hasCommitment;
        bytes32 commitmentId;
        bool isActive;
        bool isVirtual; // True if using virtual liquidity
    }
    
    struct LPPosition {
        uint256 id;
        address owner;
        address token0;
        address token1;
        uint256 liquidity;
        uint256 basePrice; // Base price per second
        uint256 minRental;
        uint256 maxRental;
        uint256 chainId;
        bool isListed;
        bool isRented;
    }
    
    // ============ Events ============
    
    event RentalCreated(
        bytes32 indexed rentalId,
        address indexed renter,
        uint256 indexed positionId,
        uint256 duration,
        uint256 temporalPrice,
        bool hasCommitment
    );
    
    event RentalEnded(
        bytes32 indexed rentalId,
        uint256 actualDuration,
        uint256 totalFee,
        uint256 predictionReward
    );
    
    event VirtualLiquidityActivated(
        bytes32 indexed rentalId,
        uint256 virtualAmount,
        uint256 latencyBound
    );
    
    // ============ Constructor ============
    
    constructor(
        address _temporalAMM,
        address _predictiveCommitment,
        address _virtualLiquidity
    ) {
        temporalAMM = TemporalAMM(_temporalAMM);
        predictiveCommitment = PredictiveCommitment(_predictiveCommitment);
        virtualLiquidity = VirtualLiquidityManager(_virtualLiquidity);
    }
    
    // ============ Core Functions ============
    
    function createRental(
        uint256 positionId,
        uint256 duration,
        PredictiveCommitmentData calldata commitment
    ) external payable returns (bytes32 rentalId) {
        require(duration >= MIN_RENTAL_DURATION, "Duration too short");
        require(duration <= MAX_RENTAL_DURATION, "Duration too long");
        
        LPPosition storage position = lpPositions[positionId];
        require(position.isListed, "Position not listed");
        require(!position.isRented, "Position already rented");
        
        rentalId = keccak256(abi.encodePacked(
            msg.sender,
            positionId,
            block.timestamp
        ));
        
        uint256 volatility = temporalAMM.getCurrentVolatility(positionId);
        uint256 demand = temporalAMM.getCurrentDemand(positionId);
        uint256 temporalPrice = temporalAMM.calculateTemporalPrice(
            0,
            volatility,
            demand,
            position.liquidity
        );
        
        uint256 totalCost = temporalPrice * duration;
        uint256 requiredCollateral = (totalCost * COLLATERAL_MULTIPLIER) / 1e18;
        
        if (commitment.hasCommitment) {
            requiredCollateral += (totalCost * PREDICTION_STAKE) / 1e18;
        }
        
        require(msg.value >= requiredCollateral, "Insufficient collateral");
        
        bool useVirtual = duration < 900 && position.chainId != block.chainid;
        
        if (useVirtual) {
            virtualLiquidity.activateShadowLiquidity(
                rentalId,
                position.id,
                position.liquidity,
                duration
            );
            emit VirtualLiquidityActivated(rentalId, position.liquidity, duration);
        }
        
        rentals[rentalId] = Rental({
            id: rentalId,
            renter: msg.sender,
            lpOwner: position.owner,
            positionId: positionId,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            duration: duration,
            liquidityAmount: position.liquidity,
            basePricePerSecond: temporalPrice,
            collateralAmount: msg.value,
            hasCommitment: commitment.hasCommitment,
            commitmentId: commitment.hasCommitment 
                ? predictiveCommitment.submitCommitment{value: (totalCost * PREDICTION_STAKE) / 1e18}(
                    rentalId, 
                    commitment.predictedUsage, 
                    commitment.zkProof
                ) 
                : bytes32(0),
            isActive: true,
            isVirtual: useVirtual
        });
        
        position.isRented = true;
        userRentals[msg.sender].push(rentalId);
        
        emit RentalCreated(rentalId, msg.sender, positionId, duration, temporalPrice, commitment.hasCommitment);
        
        return rentalId;
    }
    
    function endRental(bytes32 rentalId) external {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Rental not active");
        require(msg.sender == rental.renter || block.timestamp >= rental.endTime, "Not auth");
        
        uint256 endTime = block.timestamp < rental.endTime ? block.timestamp : rental.endTime;
        uint256 actualDuration = endTime - rental.startTime;
        
        uint256 totalFee = (rental.basePricePerSecond * actualDuration);
        
        uint256 predictionReward = 0;
        if (rental.hasCommitment) {
            predictionReward = predictiveCommitment.verifyAndReward(
                rental.commitmentId,
                actualDuration,
                rental.liquidityAmount
            );
        }
        
        uint256 totalRequired = totalFee;
        if (predictionReward < totalFee) {
             totalRequired = totalFee - predictionReward;
        } else {
             totalRequired = 0;
        }

        uint256 refund = rental.collateralAmount > totalRequired ? rental.collateralAmount - totalRequired : 0;
        
        payable(rental.lpOwner).transfer(totalRequired);
        if (refund > 0) {
            payable(rental.renter).transfer(refund);
        }
        
        rental.isActive = false;
        lpPositions[rental.positionId].isRented = false;
        
        if (rental.isVirtual) {
            virtualLiquidity.deactivateShadowLiquidity(rentalId);
        }
        
        emit RentalEnded(rentalId, actualDuration, totalFee, predictionReward);
    }
    
    function listPosition(
        uint256 positionId,
        uint256 basePrice,
        uint256 minRental,
        uint256 maxRental,
        uint256 liquidity
    ) external {
        lpPositions[positionId] = LPPosition({
            id: positionId,
            owner: msg.sender,
            token0: address(0),
            token1: address(0),
            liquidity: liquidity,
            basePrice: basePrice,
            minRental: minRental,
            maxRental: maxRental,
            chainId: block.chainid,
            isListed: true,
            isRented: false
        });
    }
}
