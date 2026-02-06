import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'
import FlashLPABI from '@/lib/abis/FlashLP.json'

const CONTRACT_ADDRESSES = {
    421614: '0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567', // Arbitrum Sepolia  
    84532: '0x8BC377c95BcF6B14c270dbA2597c3034adeb4815'   // Base Sepolia
}

const CHAINS = {
    421614: arbitrumSepolia,
    84532: baseSepolia
}

export async function GET(
    request: NextRequest,
    { params }: { params: { rentalId: string } }
) {
    try {
        const rentalId = params.rentalId
        const chainId = parseInt(request.nextUrl.searchParams.get('chainId') || '421614')

        if (!CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]) {
            return NextResponse.json({ error: 'Invalid chain ID' }, { status: 400 })
        }

        const chain = CHAINS[chainId as keyof typeof CHAINS]
        const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]

        // Get RPC URL from environment
        const rpcUrl = chainId === 421614
            ? process.env.ARBITRUM_SEPOLIA_RPC || 'https://arbitrum-sepolia-rpc.publicnode.com'
            : process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'

        // Create public client with custom RPC
        const client = createPublicClient({
            chain,
            transport: http(rpcUrl)
        })

        // Fetch rental data
        const [rental, profits, swaps] = await Promise.all([
            client.readContract({
                address: contractAddress as `0x${string}`,
                abi: FlashLPABI,
                functionName: 'getRental',
                args: [BigInt(rentalId)]
            }),
            client.readContract({
                address: contractAddress as `0x${string}`,
                abi: FlashLPABI,
                functionName: 'getRentalProfits',
                args: [BigInt(rentalId)]
            }),
            client.readContract({
                address: contractAddress as `0x${string}`,
                abi: FlashLPABI,
                functionName: 'getSwapHistory',
                args: [BigInt(rentalId)]
            })
        ])

        // Convert BigInt to string for JSON serialization
        const serializeData = (obj: any): any => {
            if (typeof obj === 'bigint') {
                return obj.toString()
            }
            if (Array.isArray(obj)) {
                return obj.map(serializeData)
            }
            if (obj && typeof obj === 'object') {
                const serialized: any = {}
                for (const key in obj) {
                    serialized[key] = serializeData(obj[key])
                }
                return serialized
            }
            return obj
        }

        return NextResponse.json({
            rental: serializeData(rental),
            profits: serializeData(profits),
            swaps: serializeData(swaps),
            chainId,
            fetchedAt: new Date().toISOString()
        })
    } catch (error: any) {
        console.error('Error fetching rental data:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch rental data' },
            { status: 500 }
        )
    }
}
