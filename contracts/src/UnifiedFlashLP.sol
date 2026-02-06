// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UnifiedFlashLP
 * @notice Simplified all-in-one contract for liquidity rent with basic analytics
 */
contract UnifiedFlashLP is ERC721, Ownable, ReentrancyGuard {
    
    uint256 private _rentalId;
    uint256 private _poolId;
    uint256 public platformFeeBps = 200;
    
   mapping(uint256 => bool) public supportedChains;
    
    struct Pool {
        address owner;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        bool exists;
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
    }
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Rental) public rentals;
    mapping(address => uint256[]) public ownerPools;
    mapping(address => uint256[]) public renterRentals;
    
    event PoolCreated(uint256 indexed poolId, address owner, address token0, address token1);
    event RentalCreated(uint256 indexed rentalId, uint256 indexed poolId, address renter, uint256 duration);
    event SwapExecuted(uint256 indexed rentalId, uint256 amountIn, uint256 amountOut);
    event RentalEnded(uint256 indexed rentalId, uint256 feesEarned);
    
    constructor() 
        ERC721("Flash LP Rental", "FLPR") 
        Ownable(msg.sender) 
    {
        supportedChains[421614] = true;  // Arbitrum Sepolia
        supportedChains[84532] = true;   // Base Sepolia
    }
    
    function createPool(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (uint256 poolId) {
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");
        
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1);
        
        poolId = ++_poolId;
        pools[poolId] = Pool(msg.sender, token0, token1, amount0, amount1, true);
        ownerPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, token0, token1);
    }
    
    function rentPool(
        uint256 poolId,
        uint256 duration,
        uint256 pricePerSecond
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
            feesEarned: 0
        });
        
        renterRentals[msg.sender].push(rentalId);
        
        emit RentalCreated(rentalId, poolId, msg.sender, duration);
    }
    
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
        
        emit SwapExecuted(rentalId, amountIn, amountOut);
    }
    
    function endRental(uint256 rentalId) external nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.isActive, "Not active");
        require(
            block.timestamp >= rental.endTime || 
            msg.sender == rental.renter || 
            msg.sender == rental.poolOwner,
            "Not authorized"
        );
        
        uint256 duration = block.timestamp > rental.endTime 
            ? rental.endTime - rental.startTime 
            : block.timestamp - rental.startTime;
        uint256 cost = duration * rental.pricePerSecond;
        
        uint256 platformFee = (rental.feesEarned * platformFeeBps) / 10000;
        uint256 renterProfit = (rental.feesEarned * 80) / 100;
        uint256 ownerProfit = (rental.feesEarned * 20) / 100;
        
        rental.isActive = false;
        
        payable(rental.poolOwner).transfer(cost + ownerProfit);
        payable(owner()).transfer(platformFee);
        
        uint256 refund = rental.collateral - cost + renterProfit;
        if (refund > 0) {
            payable(rental.renter).transfer(refund);
        }
        
        emit RentalEnded(rentalId, rental.feesEarned);
    }
    
    function getRental(uint256 rentalId) external view returns (Rental memory) {
        return rentals[rentalId];
    }
    
    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    function getOwnerPools(address owner) external view returns (uint256[] memory) {
        return ownerPools[owner];
    }
    
    function getRenterRentals(address renter) external view returns (uint256[] memory) {
        return renterRentals[renter];
    }
    
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Too high");
        platformFeeBps = newFee;
    }
}
