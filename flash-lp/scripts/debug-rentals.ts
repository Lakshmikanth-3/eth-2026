import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '../src/lib/contracts'
import dotenv from 'dotenv';

dotenv.config();

// Use the ABI fragment for getRenterRentals
const ABI = [{
    "inputs": [{ "name": "renter", "type": "address" }],
    "name": "getRenterRentals",
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
}] as const

async function debugRentals() {
    console.log('--- Debugging Rentals Query ---')

    // Use the actual user's address
    const testAddress = '0x43DDBD19381C8Ea8C1e4670d18DdB97c43fbEFDC'
    const rpcUrl = 'https://base-sepolia-rpc.publicnode.com'

    console.log('Contract:', CONTRACT_ADDRESSES[84532].FlashLP)
    console.log('Testing address:', testAddress)
    console.log('RPC:', rpcUrl)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl)
    })

    const blockNumber = await client.getBlockNumber()
    console.log('Block Number:', blockNumber.toString())

    console.log('\nQuerying getRenterRentals...')

    try {
        const rentalIds = await client.readContract({
            address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
            abi: ABI,
            functionName: 'getRenterRentals',
            args: [testAddress as `0x${string}`]
        }) as bigint[]

        console.log('Result:', rentalIds)
        console.log('Rental IDs:', rentalIds.map(id => id.toString()))
        console.log('Count:', rentalIds.length)

        if (rentalIds.length === 0) {
            console.log('\n❌ No rentals found for this address!')
            console.log('This could mean:')
            console.log('1. No rent transactions have been executed')
            console.log('2. Transactions succeeded but contract didn\'t store the renterRentals mapping')
            console.log('3. Different address was used for the transaction')
        } else {
            console.log('\n✅ Found rentals!')
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message)
        console.error(error)
    }

    console.log('\n--- End Debug ---')
}

debugRentals()
