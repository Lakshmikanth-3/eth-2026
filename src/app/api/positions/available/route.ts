import { NextResponse } from 'next/server'
import type { Position } from '@/types'

// Mock data - replace with actual contract calls in production
const mockPositions: Position[] = [
    {
        id: '1',
        poolName: 'USDC/ETH',
        token0: 'USDC',
        token1: 'ETH',
        liquidity: 1000000,        // ✅ Fixed: number instead of string
        pricePerSecond: 0.00001,      // ~0.036 ETH per hour (testnet-friendly)
        pricePerHour: 0.036,
        chain: 'arbitrum',
        available: true,
        apr: 24.5,                 // ✅ Fixed: number instead of string
    },
    {
        id: '2',
        poolName: 'USDC/USDT',
        token0: 'USDC',
        token1: 'USDT',
        liquidity: 500000,
        pricePerSecond: 0.000005,     // ~0.018 ETH per hour
        pricePerHour: 0.018,
        chain: 'base',
        available: true,
        apr: 18.2,
    },
    {
        id: '3',
        poolName: 'ETH/DAI',
        token0: 'ETH',
        token1: 'DAI',
        liquidity: 2000000,
        pricePerSecond: 0.00002,      // ~0.072 ETH per hour
        pricePerHour: 0.072,
        chain: 'optimism',
        available: true,
        apr: 21.8,
    },
    {
        id: '4',
        poolName: 'WBTC/ETH',
        token0: 'WBTC',
        token1: 'ETH',
        liquidity: 750000,
        pricePerSecond: 0.000008,     // ~0.029 ETH per hour
        pricePerHour: 0.029,
        chain: 'arbitrum',
        available: true,
        apr: 19.5,
    },
    {
        id: '5',
        poolName: 'LINK/ETH',
        token0: 'LINK',
        token1: 'ETH',
        liquidity: 300000,
        pricePerSecond: 0.000003,     // ~0.011 ETH per hour
        pricePerHour: 0.011,
        chain: 'base',
        available: false,
        apr: 22.1,
    },
    {
        id: '6',
        poolName: 'ETH/USDT',
        token0: 'ETH',
        token1: 'USDT',
        liquidity: 1250000,
        pricePerSecond: 0.073,
        pricePerHour: 262.80,
        chain: 'optimism',
        available: true,
        apr: 20.7,
    },
]

export async function GET(request: Request) {
    try {
        // ✅ Safe URL parsing with error handling
        const { searchParams } = new URL(request.url)
        const chain = searchParams.get('chain')

        // ✅ Validate chain parameter
        const validChains = ['arbitrum', 'base', 'optimism']
        if (chain && !validChains.includes(chain)) {
            return NextResponse.json(
                { error: 'Invalid chain. Must be: arbitrum, base, or optimism' },
                { status: 400 }
            )
        }

        // Filter positions
        let positions = mockPositions

        if (chain) {
            positions = positions.filter(p => p.chain === chain)
        }

        // ✅ Add cache headers for performance
        return NextResponse.json(positions, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
                'Content-Type': 'application/json',
            }
        })
    } catch (error) {
        // ✅ Handle malformed URLs
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}
