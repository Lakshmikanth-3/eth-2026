// FlashLP contract types
export interface Pool {
    owner: string;
    token0: string;
    token1: string;
    amount0: bigint;
    amount1: bigint;
    chainId: bigint;
    exists: boolean;
    totalSwaps: bigint;
    totalFeesCollected: bigint;
}

export interface Rental {
    poolId: bigint;
    renter: string;
    poolOwner: string;
    startTime: bigint;
    endTime: bigint;
    pricePerSecond: bigint;
    collateral: bigint;
    isActive: boolean;
    swapCount: bigint;
    totalVolume: bigint;
    totalFeesEarned: bigint;
    totalGasCost: bigint;
}

export interface SwapDetail {
    rentalId: bigint;
    timestamp: bigint;
    swapper: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    amountOut: bigint;
    gasPrice: bigint;
    feeCharged: bigint;
    sourceChain: bigint;
    destChain: bigint;
    isCrossChain: boolean;
}

export interface ProfitBreakdown {
    totalFeesEarned: bigint;
    rentalCostPaid: bigint;
    gasCostEstimate: bigint;
    grossProfit: bigint;
    netProfit: bigint;
    roi: bigint; // in basis points (100 = 1%)
}

export interface RentalDetails {
    rental: Rental;
    profits: ProfitBreakdown;
    swapCount: bigint;
}
