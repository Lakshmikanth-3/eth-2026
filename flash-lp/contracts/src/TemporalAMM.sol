// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title TemporalAMM
 * @notice Implements 4-dimensional pricing surface for temporal liquidity
 * @dev Uses exponential decay, volatility, demand, and liquidity depth
 */
contract TemporalAMM {
    using Math for uint256;
    
    // ============ Constants ============
    
    uint256 public constant DECAY_RATE = 0.0001e18; // λ = 0.01% per hour
    uint256 public constant PRECISION = 1e18;
    
    // ============ State Variables ============
    
    // Volatility oracle data
    mapping(uint256 => VolatilityData) public volatilityData;
    
    // Demand tracking
    mapping(uint256 => DemandData) public demandData;
    
    struct VolatilityData {
        uint256 realizedVolatility; // σ in basis points
        uint256 lastUpdate;
        uint256 historicalAverage;
    }
    
    struct DemandData {
        uint256 activeRentals;
        uint256 totalDemandScore;
        uint256 lastUpdate;
    }
    
    // ============ Core Pricing Function ============
    
    /**
     * @notice Calculate temporal price using 4D surface
     * @dev P(t,σ,δ,L) = P₀ · e^(-λt) · √(1+σ²) · (1+tanh(δ)) · (1/(1+L))
     * @param timeElapsed Time since rental start (seconds)
     * @param volatilityIndex Current volatility (basis points)
     * @param demandCoefficient Current demand score
     * @param liquidityDepth Amount of liquidity
     * @return pricePerSecond Price in wei per second
     */
    function calculateTemporalPrice(
        uint256 timeElapsed,
        uint256 volatilityIndex,
        uint256 demandCoefficient,
        uint256 liquidityDepth
    ) public pure returns (uint256 pricePerSecond) {
        // Component 1: Time decay e^(-λt)
        // Approximation: e^x ≈ 1 + x + x²/2 + x³/6 (Taylor series)
        uint256 exponent = (DECAY_RATE * timeElapsed) / PRECISION;
        uint256 decayFactor = PRECISION - exponent + (exponent * exponent) / (2 * PRECISION);
        
        // Component 2: Volatility multiplier √(1 + σ²)
        uint256 volSquared = (volatilityIndex * volatilityIndex) / PRECISION;
        uint256 volMultiplier = sqrt(PRECISION + volSquared);
        
        // Component 3: Demand curve (1 + tanh(δ))
        // tanh approximation: x / (1 + |x|)
        uint256 tanhDemand = (demandCoefficient * PRECISION) / 
            (PRECISION + demandCoefficient);
        uint256 demandMultiplier = PRECISION + tanhDemand;
        
        // Component 4: Liquidity depth discount
        uint256 liquidityFactor = (PRECISION * PRECISION) / 
            (PRECISION + liquidityDepth / 1e6 + 1);
        
        // Combine all components
        uint256 basePrice = 1e14; // 0.0001 ETH per second base
        
        pricePerSecond = basePrice;
        pricePerSecond = (pricePerSecond * decayFactor) / PRECISION;
        pricePerSecond = (pricePerSecond * volMultiplier) / PRECISION;
        pricePerSecond = (pricePerSecond * demandMultiplier) / PRECISION;
        pricePerSecond = (pricePerSecond * liquidityFactor) / PRECISION;
        
        return pricePerSecond;
    }
    
    /**
     * @notice Calculate integral of price over duration (for total cost)
     * @dev Numerical integration using trapezoidal rule
     */
    function calculateIntegratedCost(
        uint256 duration,
        uint256 volatilityIndex,
        uint256 demandCoefficient,
        uint256 liquidityDepth
    ) public pure returns (uint256 totalCost) {
        uint256 steps = duration / 60; // 1-minute steps
        if (steps == 0) steps = 1;
        
        uint256 dt = duration / steps;
        
        for (uint256 i = 0; i < steps; i++) {
            uint256 t = i * dt;
            uint256 price = calculateTemporalPrice(
                t,
                volatilityIndex,
                demandCoefficient,
                liquidityDepth
            );
            totalCost += price * dt;
        }
        
        return totalCost;
    }
    
    // ============ Oracle Functions ============
    
    function updateVolatility(
        uint256 positionId,
        uint256 newVolatility
    ) external {
        // TODO: Add access control (only oracle)
        volatilityData[positionId] = VolatilityData({
            realizedVolatility: newVolatility,
            lastUpdate: block.timestamp,
            historicalAverage: (volatilityData[positionId].historicalAverage + newVolatility) / 2
        });
    }
    
    function updateDemand(
        uint256 positionId,
        uint256 newDemandScore
    ) external {
        // TODO: Add access control
        DemandData storage data = demandData[positionId];
        data.totalDemandScore = newDemandScore;
        data.lastUpdate = block.timestamp;
    }
    
    // ============ View Functions ============
    
    function getCurrentVolatility(uint256 positionId) external view returns (uint256) {
        return volatilityData[positionId].realizedVolatility;
    }
    
    function getCurrentDemand(uint256 positionId) external view returns (uint256) {
        return demandData[positionId].totalDemandScore;
    }
    
    // ============ Math Helpers ============
    
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
