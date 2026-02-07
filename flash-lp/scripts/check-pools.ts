import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const deployments = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments.json'), 'utf-8')
)

const UnifiedFlashLPArtifact = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLP.sol/UnifiedFlashLP.json'),
        'utf-8'
    )
)

async function main() {
    console.log('🔍 Checking Pools on Base Sepolia...\n')

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    const flashLPAddress = deployments.baseSepolia.unifiedFlashLP as `0x${string}`

    console.log(`FlashLP Contract: ${flashLPAddress}\n`)

    // Check nextPoolId
    const nextPoolId = await client.readContract({
        address: flashLPAddress,
        abi: UnifiedFlashLPArtifact.abi,
        functionName: 'nextPoolId'
    }) as bigint

    console.log(`Next Pool ID: ${nextPoolId}`)
    console.log(`Expected pools: 1 to ${nextPoolId - 1n}\n`)

    // Check pools 1-10
    console.log('📊 Pool Details:\n')

    for (let i = 1; i <= 10; i++) {
        try {
            const pool = await client.readContract({
                address: flashLPAddress,
                abi: UnifiedFlashLPArtifact.abi,
                functionName: 'pools',
                args: [BigInt(i)]
            }) as any

            // Handle both array and object returns
            const owner = pool.owner || pool[0]
            const token0 = pool.token0 || pool[1]
            const token1 = pool.token1 || pool[2]
            const amount0 = pool.amount0 || pool[3]
            const amount1 = pool.amount1 || pool[4]
            const exists = pool.exists ?? pool[5]

            console.log(`Pool ${i}:`)
            console.log(`  Exists: ${exists}`)
            console.log(`  Owner: ${owner}`)
            console.log(`  Token0: ${token0}`)
            console.log(`  Token1: ${token1}`)
            console.log(`  Amount0: ${amount0}`)
            console.log(`  Amount1: ${amount1}`)

            // Check if it's a zero address pool
            const zeroAddress = '0x0000000000000000000000000000000000000000'
            if (token0?.toLowerCase() === zeroAddress.toLowerCase()) {
                console.log(`  ⚠️  Token0 is zero address - would be filtered out`)
            }
            if (token1?.toLowerCase() === zeroAddress.toLowerCase()) {
                console.log(`  ⚠️  Token1 is zero address - would be filtered out`)
            }

            console.log('')

        } catch (error: any) {
            console.log(`Pool ${i}: ❌ Does not exist or error reading\n`)
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
