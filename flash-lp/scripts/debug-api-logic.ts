import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '../src/lib/contracts'
import dotenv from 'dotenv';

dotenv.config();

const ABI = [{
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
}] as const

async function debugApiLogic() {
    console.log('--- Debugging API Logic (Default RPC) ---')

    // START CHANGE: Use default RPC (no args)
    const baseClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
    })
    // END CHANGE

    const block = await baseClient.getBlockNumber()
    console.log('Block:', block.toString())

    console.log('\n[Base] Checking pools 1-5...')
    for (let i = 1; i <= 5; i++) {
        try {
            console.log(`Querying pool ${i}...`)
            const pool = await baseClient.readContract({
                address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
                abi: ABI,
                functionName: 'pools',
                args: [BigInt(i)]
            }) as any

            // Check existence logic
            if (!pool) continue

            const exists = Array.isArray(pool) ? pool[5] : pool.exists
            console.log(`Pool ${i} exists:`, exists)

            if (!exists) continue

            console.log(`✅ [Base] Found pool ${i}`)
        } catch (error: any) {
            console.log(`❌ Error querying pool ${i}:`, error.message)
        }
    }
    console.log('\n--- End Debug ---')
}

debugApiLogic()
