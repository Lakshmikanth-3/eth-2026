import { NextResponse } from 'next/server'
import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia, arbitrumSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const address = searchParams.get('address')

        // Validate address format
        if (!address) {
            return NextResponse.json([])
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json(
                { error: 'Invalid Ethereum address format' },
                { status: 400 }
            )
        }

        const allRentals = []

        // Query Base Sepolia
        try {
            const baseClient = createPublicClient({
                chain: baseSepolia,
                transport: http('https://base-sepolia-rpc.publicnode.com')
            })

            console.log(`[Base] Querying rentals for address: ${address}`)

            // WORKAROUND: getRenterRentals mapping is broken on deployed contract
            // Query rental IDs 1-100 directly and filter by renter
            console.log('[Base] Using direct rental ID scan workaround...')

            const rentalABI = [{
                "inputs": [{ "name": "", "type": "uint256" }],
                "name": "rentals",
                "outputs": [
                    { "name": "poolId", "type": "uint256" },
                    { "name": "renter", "type": "address" },
                    { "name": "poolOwner", "type": "address" },
                    { "name": "startTime", "type": "uint256" },
                    { "name": "endTime", "type": "uint256" },
                    { "name": "pricePerSecond", "type": "uint256" },
                    { "name": "collateral", "type": "uint256" },
                    { "name": "isActive", "type": "bool" },
                    { "name": "swapCount", "type": "uint256" },
                    { "name": "feesEarned", "type": "uint256" },
                    { "name": "channelId", "type": "bytes32" }
                ],
                "stateMutability": "view",
                "type": "function"
            }] as const

            const rentalIds: bigint[] = []

            // Scan rental IDs 1-100
            for (let i = 1; i <= 100; i++) {
                try {
                    const rental = await baseClient.readContract({
                        address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
                        abi: rentalABI,
                        functionName: 'rentals',
                        args: [BigInt(i)]
                    }) as any

                    // Check if rental exists and belongs to this user
                    const renter = rental.renter || rental[1]
                    if (renter && renter.toLowerCase() === address.toLowerCase()) {
                        rentalIds.push(BigInt(i))
                    }
                } catch (error) {
                    // Rental doesn't exist, continue
                    continue
                }
            }

            console.log(`[Base] User ${address} has ${rentalIds.length} rentals:`, rentalIds.map(id => id.toString()))

            for (const rentalId of rentalIds) {
                try {
                    // Fetch rental data
                    const rental = await baseClient.readContract({
                        address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
                        abi: ABIS.FlashLP,
                        functionName: 'rentals',
                        args: [rentalId]
                    }) as any

                    // Handle both array and object returns
                    const poolId = rental.poolId || rental[0]
                    const renter = rental.renter || rental[1]
                    const startTime = Number(rental.startTime || rental[3]) * 1000
                    const endTime = Number(rental.endTime || rental[4]) * 1000
                    const pricePerSecond = rental.pricePerSecond || rental[5]
                    const isActive = rental.isActive ?? rental[7]
                    const channelId = rental.channelId || rental[10]

                    // Get pool details
                    const pool = await baseClient.readContract({
                        address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
                        abi: ABIS.FlashLP,
                        functionName: 'pools',
                        args: [poolId]
                    }) as any

                    const now = Date.now()

                    // Token symbol helper
                    const getTokenSymbol = (addr: string) => {
                        const lowerAddr = addr.toLowerCase()
                        if (lowerAddr.includes('c7238')) return 'USDC'
                        if (lowerAddr === '0x4200000000000000000000000000000000000006'.toLowerCase()) return 'WETH'
                        if (lowerAddr.includes('usdt')) return 'USDT'
                        if (lowerAddr.includes('dai')) return 'DAI'
                        return addr.slice(2, 8).toUpperCase()
                    }

                    const token0 = pool.token0 || pool[1]
                    const token1 = pool.token1 || pool[2]
                    const token0Symbol = getTokenSymbol(token0)
                    const token1Symbol = getTokenSymbol(token1)

                    allRentals.push({
                        id: rentalId.toString(),
                        positionId: poolId.toString(),
                        poolName: `${token0Symbol}/${token1Symbol}`,
                        startTime: startTime,
                        endTime: endTime,
                        totalDuration: (endTime - startTime) / 1000,
                        pricePerSecond: Number(formatEther(pricePerSecond)),
                        chain: 'base',
                        isActive: isActive && endTime > now,
                        renter: renter,
                        channelId: channelId
                    })

                } catch (error) {
                    console.error(`[Base] Error fetching rental ${rentalId}:`, error)
                    continue
                }
            }
        } catch (error) {
            console.error('[Base] Chain query error:', error)
        }

        // Query Arbitrum Sepolia
        try {
            const arbClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http('https://arbitrum-sepolia-rpc.publicnode.com')
            })

            const rentalIds = await arbClient.readContract({
                address: CONTRACT_ADDRESSES[421614].FlashLP as `0x${string}`,
                abi: ABIS.FlashLP,
                functionName: 'getRenterRentals',
                args: [address as `0x${string}`]
            }) as bigint[]

            console.log(`[Arbitrum] User ${address} has ${rentalIds.length} rentals`)

            for (const rentalId of rentalIds) {
                try {
                    const rental = await arbClient.readContract({
                        address: CONTRACT_ADDRESSES[421614].FlashLP as `0x${string}`,
                        abi: ABIS.FlashLP,
                        functionName: 'rentals',
                        args: [rentalId]
                    }) as any

                    const pool = await arbClient.readContract({
                        address: CONTRACT_ADDRESSES[421614].FlashLP as `0x${string}`,
                        abi: ABIS.FlashLP,
                        functionName: 'pools',
                        args: [rental.poolId]
                    }) as any

                    const now = Date.now()
                    const startTime = Number(rental.startTime) * 1000
                    const endTime = Number(rental.endTime) * 1000

                    const getTokenSymbol = (addr: string) => {
                        const lowerAddr = addr.toLowerCase()
                        if (lowerAddr.includes('c7238')) return 'USDC'
                        if (lowerAddr === '0x4200000000000000000000000000000000000006'.toLowerCase()) return 'WETH'
                        if (lowerAddr.includes('usdt')) return 'USDT'
                        if (lowerAddr.includes('dai')) return 'DAI'
                        return addr.slice(2, 8).toUpperCase()
                    }

                    const token0Symbol = getTokenSymbol(pool.token0)
                    const token1Symbol = getTokenSymbol(pool.token1)

                    allRentals.push({
                        id: rentalId.toString(),
                        positionId: rental.poolId.toString(),
                        poolName: `${token0Symbol}/${token1Symbol}`,
                        startTime: startTime,
                        endTime: endTime,
                        totalDuration: (endTime - startTime) / 1000,
                        pricePerSecond: Number(formatEther(rental.pricePerSecond)),
                        chain: 'arbitrum',
                        isActive: rental.isActive && endTime > now,
                        renter: rental.renter,
                        channelId: rental.channelId
                    })

                } catch (error) {
                    console.error(`[Arbitrum] Error fetching rental ${rentalId}:`, error)
                    continue
                }
            }
        } catch (error) {
            console.error('[Arbitrum] Chain query error:', error)
        }

        console.log(`[API] Found ${allRentals.length} total rentals`)

        return NextResponse.json(allRentals, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Content-Type': 'application/json',
            }
        })

    } catch (error) {
        console.error('Rentals API Error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch rentals',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
