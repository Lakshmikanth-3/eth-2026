import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const FLASH_LP_ADDRESS = '0x4ffeb090ba98760deb7815f40e0d29b9a07fa819'

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

async function main() {
    console.log('🔍 checking contract state for:', FLASH_LP_ADDRESS)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    console.log('Reading pools(1)...')
    try {
        const pool = await client.readContract({
            address: FLASH_LP_ADDRESS,
            abi: ABI,
            functionName: 'pools',
            args: [1n]
        }) as any

        console.log('Pool 1 Data:', pool)
        console.log('Exists:', pool[5] || pool.exists)
    } catch (e) {
        console.error('Error reading pool 1:', e)
    }
}

main()
