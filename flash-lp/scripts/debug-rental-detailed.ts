import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '../src/lib/contracts'
import dotenv from 'dotenv';

dotenv.config();

const GET_RENTER_RENTALS_ABI = [{
    "inputs": [{ "name": "renter", "type": "address" }],
    "name": "getRenterRentals",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
}] as const

const RENTALS_ABI = [{
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

async function debugRentalDetailed() {
    console.log('=== Debugging Rental ID 4 ===')

    const userAddress = '0x43DDBD19381C8Ea8C1e4670d18DdB97c43fbEFDC'
    const rentalId = 4n
    const rpcUrl = 'https://base-sepolia-rpc.publicnode.com'

    console.log('Contract:', CONTRACT_ADDRESSES[84532].FlashLP)
    console.log('User address:', userAddress)
    console.log('Testing rental ID:', rentalId.toString())

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl)
    })

    // Test 1: Query getRenterRentals
    console.log('\n--- Test 1: getRenterRentals ---')
    try {
        const rentalIds = await client.readContract({
            address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
            abi: GET_RENTER_RENTALS_ABI,
            functionName: 'getRenterRentals',
            args: [userAddress as `0x${string}`]
        }) as bigint[]

        console.log('Returned rental IDs:', rentalIds.map(id => id.toString()))
        console.log('Count:', rentalIds.length)

        if (rentalIds.includes(rentalId)) {
            console.log('✅ Rental ID 4 is in the list!')
        } else {
            console.log('❌ Rental ID 4 is NOT in the returned list')
        }
    } catch (error: any) {
        console.error('❌ getRenterRentals failed:', error.message)
    }

    // Test 2: Query rental ID 4 directly
    console.log('\n--- Test 2: Query Rental ID 4 Directly ---')
    try {
        const rental = await client.readContract({
            address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
            abi: RENTALS_ABI,
            functionName: 'rentals',
            args: [rentalId]
        }) as any

        console.log('Rental data:', rental)

        if (Array.isArray(rental)) {
            console.log('  Pool ID:', rental[0]?.toString())
            console.log('  Renter:', rental[1])
            console.log('  Pool Owner:', rental[2])
            console.log('  isActive:', rental[7])
        } else {
            console.log('  Pool ID:', rental.poolId?.toString())
            console.log('  Renter:', rental.renter)
            console.log('  Pool Owner:', rental.poolOwner)
            console.log('  isActive:', rental.isActive)
        }

        const renterMatch = Array.isArray(rental)
            ? rental[1]?.toLowerCase() === userAddress.toLowerCase()
            : rental.renter?.toLowerCase() === userAddress.toLowerCase()

        if (renterMatch) {
            console.log('✅ Rental ID 4 EXISTS and belongs to user!')
        } else {
            console.log('⚠️ Rental exists but renter mismatch')
        }

    } catch (error: any) {
        console.error('❌ Direct rental query failed:', error.message)
    }

    console.log('\n=== End Debug ===')
}

debugRentalDetailed()
