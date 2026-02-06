// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FlashLP - Complete Cross-Chain Liquidity Rental System
 * @notice Unified contract for liquidity rental with comprehensive analytics and profit tracking
 */
contract FlashLP is ERC721, Ownable, ReentrancyGuard {
    
    uint256 private _rentalIdCounter;
    uint256 private _poolIdCounter;
    uint256 private _swapIdCounter;
    uint256 public platformFeeBps = 200; // 2%
    
    // Supported chains for cross-chain operations
    mapping(uint256 => bool) public supportedChains;
    
    // ============ DATA STRUCTURES ============
    
    struct Pool {
        address owner;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 chainId;
        bool exists;
        uint256 totalSwaps;
        uint256 totalFeesCollected;
    }
    
    struct Rental {
        uint256 poolId;
        address renter;
        address poolOwner;
        uint256 startTime;
        uint256 endTime;
        uint256 pricePerSecond;
        uint256 collateral;
        bool isActive;
        uint256 swapCount;
        uint256 totalVolume;
        uint256 totalFeesEarned;
        uint256 totalGasCost;
    }
    
    struct SwapDetail {
        uint256 rentalId;
        uint256 timestamp;
        address swapper;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 gasPrice;
        uint256 feeCharged;
        uint256 sourceChain;
        uint256 destChain;
        bool isCrossChain;
    }
    
    struct ProfitBreakdown {
        uint256 totalFeesEarned;
        uint256 rentalCostPaid;
        uint256 gasCostEstimate;
        uint256 grossProfit;
        uint256 netProfit;
        uint256 roi; // in basis points (100 = 1%)
    }
    
    // ============ STORAGE ============
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Rental) public rentals;
    mapping(uint256 => SwapDetail) public swaps;
    
    // Tracking mappings
    mapping(address => uint256[]) public ownerPools;
    mapping(address => uint256[]) public renterRentals;
    mapping(uint256 => uint256[]) public poolRentals; // poolId => rentalIds
    mapping(uint256 => uint256[]) public rentalSwaps; // rentalId => swapIds
    
    // ============ EVENTS ============
    
    event PoolCreated(
        uint256 indexed poolId,
        address indexed owner,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 chainId
    );
    
    event RentalCreated(
        uint256 indexed rentalId,
        uint256 indexed poolId,
        address indexed renter,
        uint256 duration,
        uint256 pricePerSecond,
        uint256 collateral
    );
    
    event SwapExecuted(
        uint256 indexed swapId,
        uint256 indexed rentalId,
        address indexed swapper,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeCharged,
        bool isCrossChain
    );
    
    event RentalEnded(
        uint256 indexed rentalId,
        uint256 totalSwaps,
        uint256 totalFeesEarned,
        uint256 netProfit
    );
    
    event ProfitWithdrawn(
        uint256 indexed rentalId,
        address indexed renter,
        uint256 amount
    );
    
    // ============ CONSTRUCTOR ============
    
    constructor() 
        ERC721("Flash LP Rental Position", "FLPR") 
        Ownable(msg.sender) 
    {
        // Initialize supported chains
        supportedChains[421614] = true;  // Arbitrum Sepolia
        supportedChains[84532] = true;   // Base Sepolia
        supportedChains[11155420] = true; // Optimism Sepolia
    }
    
    // ============ POOL MANAGEMENT ============
    
    function createPool(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (uint256 poolId) {
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");
        
        // Transfer tokens
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        
        poolId = ++_poolIdCounter;
        
        pools[poolId] = Pool({
            owner: msg.sender,
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            chainId: block.chainid,
            exists: true,
            totalSwaps: 0,
            totalFeesCollected: 0
        });
        
        ownerPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, token0, token1, amount0, amount1, block.chainid);
    }
    
    // ============ RENTAL SYSTEM ============
    
    function rentPool(
        uint256 poolId,
        uint256 duration,
        uint256 pricePerSecond
    ) external payable nonReentrant returns (uint256 rentalId) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool does not exist");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        uint256 rentalCost = duration * pricePerSecond;
        uint256 requiredCollateral = (rentalCost * 12000) / 10000; // 120%
        require(msg.value >= requiredCollateral, "Insufficient collateral");
        
        rentalId = ++_rentalIdCounter;
        
        // Mint NFT to renter as proof of ownership
        _safeMint(msg.sender, rentalId);
        
        rentals[rentalId] = Rental({
            poolId: poolId,
            renter: msg.sender,
            poolOwner: pool.owner,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            pricePerSecond: pricePerSecond,
            collateral: msg.value,
            isActive: true,
            swapCount: 0,
            totalVolume: 0,
            totalFeesEarned: 0,
            totalGasCost: 0
        });
        
        renterRentals[msg.sender].push(rentalId);
        poolRentals[poolId].push(rentalId);
        
        emit RentalCreated(rentalId, poolId, msg.sender, duration, pricePerSecond, msg.value);
    }
    
    // ============ SWAP EXECUTION ============
    
    function executeSwap(
        uint256 rentalId,
        address tokenIn,
        uint256 amountIn,
        uint256 minOut
    ) external nonReentrant returns (uint256 amountOut) {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Rental not active");
        require(block.timestamp < rental.endTime, "Rental expired");
        
        Pool storage pool = pools[rental.poolId];
        require(tokenIn == pool.token0 || tokenIn == pool.token1, "Invalid token");
        
        uint256 gasStart = gasleft();
        
        // Transfer tokens in from swapper
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Execute AMM swap
        amountOut = _executeAMMSwap(pool, tokenIn, amountIn, minOut);
        
        // Determine output token
        address tokenOut = tokenIn == pool.token0 ? pool.token1 : pool.token0;
        
        // Transfer tokens out to swapper
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        uint256 gasUsed = gasStart - gasleft();
        uint256 fee = (amountIn * 3) / 1000; // 0.3% fee
        
        // Detect cross-chain
        bool isCrossChain = block.chainid != pool.chainId;
        
        // Record swap details
        uint256 swapId = ++_swapIdCounter;
        swaps[swapId] = SwapDetail({
            rentalId: rentalId,
            timestamp: block.timestamp,
            swapper: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            gasPrice: tx.gasprice,
            feeCharged: fee,
            sourceChain: block.chainid,
            destChain: pool.chainId,
            isCrossChain: isCrossChain
        });
        
        rentalSwaps[rentalId].push(swapId);
        
        // Update rental analytics
        rental.swapCount++;
        rental.totalVolume += amountOut;
        rental.totalFeesEarned += fee;
        rental.totalGasCost += gasUsed * tx.gasprice;
        
        // Update pool analytics
        pool.totalSwaps++;
        pool.totalFeesCollected += fee;
        
        emit SwapExecuted(swapId, rentalId, msg.sender, amountIn, amountOut, fee, isCrossChain);
    }
    
    function _executeAMMSwap(
        Pool storage pool,
        address tokenIn,
        uint256 amountIn,
        uint256 minOut
    ) private returns (uint256 amountOut) {
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        
        if (tokenIn == pool.token0) {
            amountOut = (pool.amount1 * amountInWithFee) / (pool.amount0 + amountInWithFee);
            require(amountOut >= minOut, "Slippage exceeded");
            pool.amount0 += amountIn;
            pool.amount1 -= amountOut;
        } else {
            amountOut = (pool.amount0 * amountInWithFee) / (pool.amount1 + amountInWithFee);
            require(amountOut >= minOut, "Slippage exceeded");
            pool.amount1 += amountIn;
            pool.amount0 -= amountOut;
        }
    }
    
    // ============ END RENTAL ============
    
    function endRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Not active");
        require(
            block.timestamp >= rental.endTime || 
            msg.sender == rental.renter || 
            msg.sender == rental.poolOwner,
            "Not authorized"
        );
        
        rental.isActive = false;
        
        // Calculate amounts
        uint256 actualDuration = block.timestamp > rental.endTime 
            ? rental.endTime - rental.startTime 
            : block.timestamp - rental.startTime;
        uint256 rentalCost = actualDuration * rental.pricePerSecond;
        
        uint256 platformFee = (rental.totalFeesEarned * platformFeeBps) / 10000;
        uint256 ownerShare = (rental.totalFeesEarned * 20) / 100;
        uint256 renterShare = rental.totalFeesEarned - platformFee - ownerShare;
        
        // Calculate net profit for renter
        uint256 netProfit = renterShare > rentalCost ? renterShare - rentalCost : 0;
        
        // Transfers
        if (rentalCost > 0) {
            payable(rental.poolOwner).transfer(rentalCost + ownerShare);
        }
        if (platformFee > 0) {
            payable(owner()).transfer(platformFee);
        }
        
        uint256 refund = rental.collateral - rentalCost + renterShare;
        if (refund > 0) {
            payable(rental.renter).transfer(refund);
        }
        
        emit RentalEnded(rentalId, rental.swapCount, rental.totalFeesEarned, netProfit);
    }
    
    // ============ ANALYTICS & QUERIES ============
    
    function getRentalProfits(uint256 rentalId) external view returns (ProfitBreakdown memory) {
        Rental storage rental = rentals[rentalId];
        
        uint256 duration = block.timestamp > rental.endTime 
            ? rental.endTime - rental.startTime 
            : block.timestamp - rental.startTime;
        uint256 rentalCost = duration * rental.pricePerSecond;
        
        uint256 platformFee = (rental.totalFeesEarned * platformFeeBps) / 10000;
        uint256 ownerShare = (rental.totalFeesEarned * 20) / 100;
        uint256 renterShare = rental.totalFeesEarned - platformFee - ownerShare;
        
        uint256 grossProfit = renterShare > rentalCost ? renterShare - rentalCost : 0;
        uint256 netProfit = grossProfit > rental.totalGasCost ? grossProfit - rental.totalGasCost : 0;
        uint256 roi = rentalCost > 0 ? (netProfit * 10000) / rentalCost : 0;
        
        return ProfitBreakdown({
            totalFeesEarned: rental.totalFeesEarned,
            rentalCostPaid: rentalCost,
            gasCostEstimate: rental.totalGasCost,
            grossProfit: grossProfit,
            netProfit: netProfit,
            roi: roi
        });
    }
    
    function getSwapHistory(uint256 rentalId) external view returns (SwapDetail[] memory) {
        uint256[] storage swapIds = rentalSwaps[rentalId];
        SwapDetail[] memory history = new SwapDetail[](swapIds.length);
        
        for (uint256 i = 0; i < swapIds.length; i++) {
            history[i] = swaps[swapIds[i]];
        }
        
        return history;
    }
    
    function getRentalDetails(uint256 rentalId) external view returns (
        Rental memory rental,
        ProfitBreakdown memory profits,
        uint256 swapCount
    ) {
        rental = rentals[rentalId];
        profits = this.getRentalProfits(rentalId);
        swapCount = rentalSwaps[rentalId].length;
    }
    
    function getPoolRentals(uint256 poolId) external view returns (uint256[] memory) {
        return poolRentals[poolId];
    }
    
    function getOwnerPools(address owner) external view returns (uint256[] memory) {
        return ownerPools[owner];
    }
    
    function getRenterRentals(address renter) external view returns (uint256[] memory) {
        return renterRentals[renter];
    }
    
    function getPoolDetails(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    function getRental(uint256 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = newFee;
    }
    
    function addSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = true;
    }
    
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = false;
    }
}
