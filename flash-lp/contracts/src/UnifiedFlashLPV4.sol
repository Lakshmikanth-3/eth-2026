// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./YellowChannelManager.sol";

// Minimal interface for V4 Router
interface IV4Router {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    
    struct ModifyLiquidityParams {
        int24 tickLower;
        int24 tickUpper;
        int256 liquidityDelta;
        bytes32 salt;
    }
    
    function addLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable;
}

/**
 * @title UnifiedFlashLPV4
 * @notice Liquidity rental system with optional Uniswap V4 integration
 */
contract UnifiedFlashLPV4 is ERC721, Ownable, ReentrancyGuard {
    
    uint256 private _rentalId;
    uint256 private _poolId;
    uint256 public platformFeeBps = 200;
    
    YellowChannelManager public yellowChannelManager;
    IV4Router public v4Router;  // Optional V4 integration
    
    mapping(uint256 => bool) public supportedChains;
    
    struct Pool {
        address owner;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        bool exists;
        bool isV4Pool;      // NEW: flag to indicate if this pool uses V4
        uint24 v4Fee;       // NEW: V4 fee tier (3000 = 0.3%)
        int24 v4TickLower;  // NEW: V4 tick range
        int24 v4TickUpper;  // NEW: V4 tick range
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
        uint256 feesEarned;
        bytes32 channelId;
    }
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Rental) public rentals;
    mapping(address => uint256[]) public ownerPools;
    mapping(address => uint256[]) public renterRentals;
    
    event PoolCreated(uint256 indexed poolId, address owner, address token0, address token1, bool isV4Pool);
    event RentalCreated(uint256 indexed rentalId, uint256 indexed poolId, address renter, uint256 duration);
    event SwapExecuted(uint256 indexed rentalId, uint256 amountIn, uint256 amountOut);
    event RentalEnded(uint256 indexed rentalId, uint256 feesEarned);
    
    constructor(address _yellowChannelManager, address _v4Router) 
        ERC721("Flash LP Rental V4", "FLPR") 
        Ownable(msg.sender) 
    {
        yellowChannelManager = YellowChannelManager(_yellowChannelManager);
        v4Router = IV4Router(_v4Router);
        supportedChains[421614] = true;  // Arbitrum Sepolia
        supportedChains[84532] = true;   // Base Sepolia
        supportedChains[11155111] = true; // Ethereum Sepolia
    }
    
    /**
     * @notice Create a simple pool (original behavior - holds tokens directly)
     */
    function createPool(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (uint256 poolId) {
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        
        if (amount0 > 0) IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        
        poolId = ++_poolId;
        pools[poolId] = Pool({
            owner: msg.sender,
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            exists: true,
            isV4Pool: false,
            v4Fee: 0,
            v4TickLower: 0,
            v4TickUpper: 0
        });
        ownerPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, token0, token1, false);
    }
    
    /**
     * @notice Create a V4-backed pool (NEW - provides liquidity to Uniswap V4)
     * @param token0 First token address
     * @param token1 Second token address
     * @param amount0 Amount of token0
     * @param amount1 Amount of token1
     * @param fee V4 fee tier (e.g., 3000 for 0.3%)
     * @param tickLower Lower tick of liquidity range
     * @param tickUpper Upper tick of liquidity range
     */
    function createV4Pool(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper
    ) external nonReentrant returns (uint256 poolId) {
        require(address(v4Router) != address(0), "V4 not configured");
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        require(token0 < token1, "Token order"); // V4 requires sorted tokens
        
        // Transfer tokens from user to this contract
        if (amount0 > 0) IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        
        // Approve V4Router to spend tokens
        if (amount0 > 0) IERC20(token0).approve(address(v4Router), amount0);
        if (amount1 > 0) IERC20(token1).approve(address(v4Router), amount1);
        
        // Build V4 PoolKey
        IV4Router.PoolKey memory poolKey = IV4Router.PoolKey({
            currency0: token0,
            currency1: token1,
            fee: fee,
            tickSpacing: 60, // Standard tick spacing for 0.3% fee
            hooks: address(0) // No hooks for now
        });
        
        // Calculate liquidity delta (simplified - in production use proper math)
        int256 liquidityDelta = int256(amount0 + amount1);
        
        // Build liquidity params
        IV4Router.ModifyLiquidityParams memory liqParams = IV4Router.ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        // Add liquidity to V4
        v4Router.addLiquidity(poolKey, liqParams, "");
        
        // Create pool record
        poolId = ++_poolId;
        pools[poolId] = Pool({
            owner: msg.sender,
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            exists: true,
            isV4Pool: true,
            v4Fee: fee,
            v4TickLower: tickLower,
            v4TickUpper: tickUpper
        });
        ownerPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, token0, token1, true);
    }
    
    function rentPool(
        uint256 poolId,
        uint256 duration,
        uint256 pricePerSecond,
        bytes32 channelId
    ) external payable nonReentrant returns (uint256 rentalId) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool does not exist");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        
        uint256 cost = duration * pricePerSecond;
        uint256 required = (cost * 12000) / 10000;
        require(msg.value >= required, "Insufficient collateral");
        
        rentalId = ++_rentalId;
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
            feesEarned: 0,
            channelId: channelId
        });
        
        renterRentals[msg.sender].push(rentalId);
        
        emit RentalCreated(rentalId, poolId, msg.sender, duration);
    }
    
    // Keep existing functions for backward compatibility...
    function executeSwap(
        uint256 rentalId,
        address tokenIn,
        uint256 amountIn,
        uint256 minOut
    ) external nonReentrant returns (uint256 amountOut) {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Not active");
        require(block.timestamp < rental.endTime, "Expired");
        
        Pool storage pool = pools[rental.poolId];
        require(!pool.isV4Pool, "Use V4 swap for V4 pools");
        require(tokenIn == pool.token0 || tokenIn == pool.token1, "Invalid token");
        
        uint256 amountInWithFee = (amountIn * 997) / 1000;
        
        if (tokenIn == pool.token0) {
            amountOut = (pool.amount1 * amountInWithFee) / (pool.amount0 + amountInWithFee);
            require(amountOut >= minOut, "Slippage");
            pool.amount0 += amountIn;
            pool.amount1 -= amountOut;
        } else {
            amountOut = (pool.amount0 * amountInWithFee) / (pool.amount1 + amountInWithFee);
            require(amountOut >= minOut, "Slippage");
            pool.amount1 += amountIn;
            pool.amount0 -= amountOut;
        }
        
        rental.swapCount++;
        rental.feesEarned += (amountIn * 3) / 1000;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn == pool.token0 ? pool.token1 : pool.token0).transfer(msg.sender, amountOut);
        
        emit SwapExecuted(rentalId, amountIn, amountOut);
    }
    
    function endRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Not active");
        require(msg.sender == rental.renter || block.timestamp >= rental.endTime, "Not authorized");
        
        uint256 actualDuration = block.timestamp > rental.endTime 
            ? rental.endTime - rental.startTime 
            : block.timestamp - rental.startTime;
        
        uint256 actualCost = actualDuration * rental.pricePerSecond;
        uint256 platformFee = (actualCost * platformFeeBps) / 10000;
        uint256 ownerPayment = actualCost - platformFee;
        
        rental.isActive = false;
        
        payable(rental.poolOwner).transfer(ownerPayment);
        payable(owner()).transfer(platformFee);
        
        uint256 refund = rental.collateral - actualCost;
        if (refund > 0) {
            payable(rental.renter).transfer(refund);
        }
        
        emit RentalEnded(rentalId, rental.feesEarned);
    }
    
    /**
     * @notice Redeem liquidity from a pool (withdraw tokens)
     * @param poolId ID of the pool to redeem
     */
    function redeemPool(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool does not exist");
        require(pool.owner == msg.sender, "Not pool owner");
        require(!pool.isV4Pool, "Cannot redeem V4 pools directly");
        
        // Check that pool is not actively rented
        // (In production, you'd want to track active rentals per pool)
        
        uint256 amount0 = pool.amount0;
        uint256 amount1 = pool.amount1;
        
        // Clear pool balances
        pool.amount0 = 0;
        pool.amount1 = 0;
        pool.exists = false;
        
        // Transfer tokens back to owner
        if (amount0 > 0) {
            IERC20(pool.token0).transfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            IERC20(pool.token1).transfer(msg.sender, amount1);
        }
        
        emit PoolRedeemed(poolId, msg.sender, amount0, amount1);
    }
    
    event PoolRedeemed(uint256 indexed poolId, address indexed owner, uint256 amount0, uint256 amount1);
    
    // View functions...
    function getOwnerPools(address _owner) external view returns (uint256[] memory) {
        return ownerPools[_owner];
    }
    
    function getRenterRentals(address _renter) external view returns (uint256[] memory) {
        return renterRentals[_renter];
    }
}
