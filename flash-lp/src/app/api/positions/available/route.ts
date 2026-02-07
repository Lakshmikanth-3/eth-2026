import { NextResponse } from 'next/server'
import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia, arbitrumSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'

// Demo/fallback positions for better UX when no real positions exist
const DEMO_POSITIONS = [
    {
        id: 'demo-1',
        poolName: 'USDC/WETH',
        token0: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        token1: '0x4200000000000000000000000000000000000006',
        liquidity: 1000000,
        pricePerSecond: 0.00001,
        pricePerHour: 0.036,
        chain: 'arbitrum',
        available: true,
        apr: 24.5,
        owner: '0x0000000000000000000000000000000000000000'
    },
    {
        id: 'demo-2',
        poolName: 'USDT/WETH',
        token0: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        token1: '0x4200000000000000000000000000000000000006',
        liquidity: 500000,
        pricePerSecond: 0.000005,
        pricePerHour: 0.018,
        chain: 'base',
        available: true,
        apr: 18.2,
        owner: '0x0000000000000000000000000000000000000000'
    },
    {
        id: 'demo-3',
        poolName: 'DAI/USDC',
        token0: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        token1: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        liquidity: 750000,
        pricePerSecond: 0.000008,
        pricePerHour: 0.0288,
        chain: 'base',
        available: true,
        apr: 21.3,
        owner: '0x0000000000000000000000000000000000000000'
    }
]

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const chainFilter = searchParams.get('chain')

        // Validate chain filter
        const validChains = ['arbitrum', 'base']
        if (chainFilter && !validChains.includes(chainFilter)) {
            return NextResponse.json(
                { error: 'Invalid chain. Must be: arbitrum or base' },
                { status: 400 }
            )
        }

        const allPositions = []

        // Query Base Sepolia
        if (!chainFilter || chainFilter === 'base') {
            try {
                const baseClient = createPublicClient({
                    chain: baseSepolia,
                    transport: http('https://base-sepolia-rpc.publicnode.com')
                })

                console.log('[Base] Checking pools 1-5 with publicnode RPC...')

                // Parallelize manual calls
                const poolPromises = Array.from({ length: 5 }, (_, i) => i + 1).map(i =>
                    baseClient.readContract({
                        address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
                        abi: [{
                            "inputs": [{ "name": "", "type": "uint256" }],
                            "name": "pools",
                            "outputs": [
                                { "name": "owner", "type": "address" },
                                { "name": "token0", "type": "address" },
                                { "name": "token1", "type": "address" },
                                { "name": "amount0", "type": "uint256" },
                                { "name": "amount1", "type": "uint256" },
                                { "name": "exists", "type": "bool" }
                            ],
                            "stateMutability": "view",
                            "type": "function"
                        }],
                        functionName: 'pools',
                        args: [BigInt(i)]
                    }).catch(() => null)
                )

                const pools = await Promise.all(poolPromises)

                pools.forEach((pool: any, index) => {
                    const i = index + 1

                    // Debug: Log raw pool data
                    console.log(`[Base] Pool ${i} raw data:`, pool)

                    if (!pool) {
                        console.log(`[Base] Pool ${i}: null response`)
                        return
                    }

                    // Handle both array and object returns (viem can return either depending on ABI)
                    const exists = pool.exists ?? pool[5]
                    console.log(`[Base] Pool ${i} exists flag:`, exists)

                    if (!exists) {
                        console.log(`[Base] Pool ${i}: exists=false, skipping`)
                        return
                    }

                    const token0 = pool.token0 || pool[1]
                    const token1 = pool.token1 || pool[2]
                    const amount0 = pool.amount0 || pool[3]
                    const owner = pool.owner || pool[0]

                    // Skip pools with zero addresses (not properly initialized)
                    const zeroAddress = '0x0000000000000000000000000000000000000000'
                    if (token0?.toLowerCase() === zeroAddress.toLowerCase() ||
                        token1?.toLowerCase() === zeroAddress.toLowerCase()) {
                        return
                    }

                    // Derive token symbols from addresses
                    const getTokenSymbol = (addr: string) => {
                        const lowerAddr = addr.toLowerCase()
                        if (lowerAddr.includes('c7238')) return 'USDC'
                        if (lowerAddr === '0x4200000000000000000000000000000000000006'.toLowerCase()) return 'WETH'
                        if (lowerAddr.includes('usdt')) return 'USDT'
                        if (lowerAddr.includes('dai')) return 'DAI'
                        return addr.slice(2, 8).toUpperCase()
                    }

                    const token0Symbol = getTokenSymbol(token0)
                    const token1Symbol = getTokenSymbol(token1)

                    if (token0Symbol === '000000' || token1Symbol === '000000') return

                    // Calculate liquidity
                    const liquidity = Number(formatEther(amount0 || 0n)) * 1000
                    const pricePerSecond = 0.00001
                    const pricePerHour = pricePerSecond * 3600
                    const apr = liquidity > 0 ? (pricePerHour * 24 * 365 / liquidity) * 100 : 24.5

                    allPositions.push({
                        id: i.toString(),
                        poolName: `${token0Symbol}/${token1Symbol}`,
                        token0: token0,
                        token1: token1,
                        liquidity: liquidity || 1000000,
                        pricePerSecond: pricePerSecond,
                        pricePerHour: pricePerHour,
                        chain: 'base',
                        available: true,
                        apr: Number(apr.toFixed(1)),
                        owner: owner
                    })
                })
            } catch (error) {
                console.error('[Base] Chain query error:', error)
            }
        }

        // Query Arbitrum Sepolia
        if (!chainFilter || chainFilter === 'arbitrum') {
            try {
                const arbClient = createPublicClient({
                    chain: arbitrumSepolia,
                    transport: http()
                })

                console.log('[Arbitrum] Checking pools 1-5...')

                const poolPromises = Array.from({ length: 5 }, (_, i) => i + 1).map(i =>
                    arbClient.readContract({
                        address: CONTRACT_ADDRESSES[421614].FlashLP as `0x${string}`,
                        abi: [{
                            "inputs": [{ "name": "", "type": "uint256" }],
                            "name": "pools",
                            "outputs": [
                                { "name": "owner", "type": "address" },
                                { "name": "token0", "type": "address" },
                                { "name": "token1", "type": "address" },
                                { "name": "amount0", "type": "uint256" },
                                { "name": "amount1", "type": "uint256" },
                                { "name": "exists", "type": "bool" }
                            ],
                            "stateMutability": "view",
                            "type": "function"
                        }],
                        functionName: 'pools',
                        args: [BigInt(i)]
                    }).catch(() => null)
                )

                const pools = await Promise.all(poolPromises)

                pools.forEach((pool: any, index) => {
                    const i = index + 1
                    if (!pool) return

                    const exists = pool.exists ?? pool[5]
                    if (!exists) return

                    const token0 = pool.token0 || pool[1]
                    const token1 = pool.token1 || pool[2]
                    const amount0 = pool.amount0 || pool[3]
                    const owner = pool.owner || pool[0]

                    const zeroAddress = '0x0000000000000000000000000000000000000000'
                    if (token0?.toLowerCase() === zeroAddress.toLowerCase() ||
                        token1?.toLowerCase() === zeroAddress.toLowerCase()) {
                        return
                    }

                    const getTokenSymbol = (addr: string) => {
                        const lowerAddr = addr.toLowerCase()
                        if (lowerAddr.includes('c7238')) return 'USDC'
                        if (lowerAddr === '0x4200000000000000000000000000000000000006'.toLowerCase()) return 'WETH'
                        if (lowerAddr.includes('usdt')) return 'USDT'
                        if (lowerAddr.includes('dai')) return 'DAI'
                        return addr.slice(2, 8).toUpperCase()
                    }

                    const token0Symbol = getTokenSymbol(token0)
                    const token1Symbol = getTokenSymbol(token1)

                    if (token0Symbol === '000000' || token1Symbol === '000000') return

                    const liquidity = Number(formatEther(amount0 || 0n)) * 1000
                    const pricePerSecond = 0.00001
                    const pricePerHour = pricePerSecond * 3600
                    const apr = liquidity > 0 ? (pricePerHour * 24 * 365 / liquidity) * 100 : 24.5

                    allPositions.push({
                        id: i.toString(),
                        poolName: `${token0Symbol}/${token1Symbol}`,
                        token0: token0,
                        token1: token1,
                        liquidity: liquidity || 1000000,
                        pricePerSecond: pricePerSecond,
                        pricePerHour: pricePerHour,
                        chain: 'arbitrum',
                        available: true,
                        apr: Number(apr.toFixed(1)),
                        owner: owner
                    })
                })
            } catch (error) {
                console.error('[Arbitrum] Chain query error:', error)
            }
        }

        // If no real positions found, use demo positions
        if (allPositions.length === 0) {
            console.log('[API] No real positions found, using demo positions')
            const filteredDemo = chainFilter
                ? DEMO_POSITIONS.filter(p => p.chain === chainFilter)
                : DEMO_POSITIONS
            allPositions.push(...filteredDemo)
        }

        console.log(`[API] Returning ${allPositions.length} total positions`)

        return NextResponse.json(allPositions, {
            headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Content-Type': 'application/json',
            }
        })

    } catch (error) {
        console.error('Positions API Error:', error)

        // Even on error, return demo positions for better UX
        const { searchParams } = new URL(request.url)
        const chainFilter = searchParams.get('chain')
        const filteredDemo = chainFilter
            ? DEMO_POSITIONS.filter(p => p.chain === chainFilter)
            : DEMO_POSITIONS

        return NextResponse.json(filteredDemo, {
            headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Content-Type': 'application/json',
            }
        })
    }
}
