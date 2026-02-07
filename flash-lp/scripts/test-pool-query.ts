import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const CONTRACT_ADDRESS = '0x612Bc96a6354E9b14d59FB899bE3DE8fF4F1Af01'

const ABI = [
    {
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
    }
] as const

async function testPoolQuery() {
    console.log('Testing pool query on Base Sepolia...\n')

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http()
    })

    console.log('Querying pools 1-10...\n')

    for (let i = 1; i <= 10; i++) {
        try {
            const pool = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'pools',
                args: [BigInt(i)]
            })

            if (pool[5]) {  // exists = true
                console.log(`✅ Pool ${i} EXISTS:`)
                console.log('   Owner:', pool[0])
                console.log('   Token0:', pool[1])
                console.log('   Token1:', pool[2])
                console.log('   Amount0:', pool[3].toString())
                console.log('   Amount1:', pool[4].toString())
                console.log('')
            }
        } catch (error: any) {
            // Skip
        }
    }
}

testPoolQuery()
