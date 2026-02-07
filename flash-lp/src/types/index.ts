export interface Position {
    id: string
    poolName: string
    token0: string
    token1: string
    liquidity: number          // ✅ Fixed: Changed from string to number
    pricePerSecond: number     // ✅ Fixed: Changed from string to number
    pricePerHour: number       // ✅ Fixed: Changed from string to number
    chain: 'arbitrum' | 'base' | 'optimism'
    available: boolean
    apr?: number               // ✅ Fixed: Changed from string to number
    owner?: string
}

export interface Rental {
    id: string
    positionId: string
    poolName: string
    startTime: number
    endTime: number
    totalDuration: number
    pricePerSecond: number
    chain: 'arbitrum' | 'base' | 'optimism'
    isActive: boolean
    renter?: string
    token0Address?: string
    token1Address?: string
    token0Symbol?: string
    token1Symbol?: string
    channelId?: string
}

export type Chain = 'arbitrum' | 'base' | 'optimism'
