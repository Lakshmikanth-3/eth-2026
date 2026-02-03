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
        pricePerSecond: 0.058,     // ✅ Fixed: number instead of string
        pricePerHour: 208.80,      // ✅ Fixed: number instead of string
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
        pricePerSecond: 0.029,
        pricePerHour: 104.40,
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
        pricePerSecond: 0.116,
        pricePerHour: 417.60,
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
        pricePerSecond: 0.044,
        pricePerHour: 158.40,
        chain: 'arbitrum',
        available: true,
        apr: 19.5,
    },
    {
        id: '5',
        poolName: 'USDC/DAI',
        token0: 'USDC',
        token1: 'DAI',
        liquidity: 1500000,
        pricePerSecond: 0.087,
        pricePerHour: 313.20,
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
