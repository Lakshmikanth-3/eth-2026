import { createPublicClient, http, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'

dotenv.config()

// Contract Addresses
const OLD_CONTRACT = '0xd2cc5a92f47f7b5cB726f58eCc4073c3F5dc00C5' as `0x${string}`
const NEW_CONTRACT = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c' as `0x${string}`
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
const WETH = '0x4200000000000000000000000000000000000006' as `0x${string}`

// Load ABI
const flashLPABI = JSON.parse(
    require('fs').readFileSync(
        require('path').join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi

async function checkPools(client: any, contractAddress: `0x${string}`, accountAddress: `0x${string}`, label: string) {
    console.log(`\n🔎 Checking ${label} (${contractAddress})...`)

    try {
        const poolIds = await client.readContract({
            address: contractAddress,
            abi: flashLPABI,
            functionName: 'getOwnerPools',
            args: [accountAddress]
        }) as bigint[]

        if (poolIds.length === 0) {
            console.log(`   No pools found.`)
            return
        }

        console.log(`   Found ${poolIds.length} pool(s).`)

        for (const poolId of poolIds) {
            const pool = await client.readContract({
                address: contractAddress,
                abi: flashLPABI,
                functionName: 'pools',
                args: [poolId]
            }) as any

            console.log(`   Debug Pool Raw: ${JSON.stringify(pool, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )}`)

            // Map based on ABI struct: 
            // (bool exists, bool isV4Pool, address token0, address token1, uint256 amount0, uint256 amount1, uint24 v4Fee, int24 v4TickLower, int24 v4TickUpper)

            let amount0Raw, amount1Raw, isV4Pool;

            if (Array.isArray(pool)) {
                isV4Pool = pool[1];
                amount0Raw = pool[4];
                amount1Raw = pool[5];
            } else {
                // Try object properties if available
                amount0Raw = (pool as any).amount0;
                amount1Raw = (pool as any).amount1;
                isV4Pool = (pool as any).isV4Pool;
            }

            const amount0 = amount0Raw ? Number(formatUnits(amount0Raw, 6)) : 0
            const amount1 = amount1Raw ? Number(formatUnits(amount1Raw, 18)) : 0

            console.log(`   - Pool #${poolId}: ${amount0} USDC + ${amount1} WETH ${isV4Pool ? '(V4)' : '(Simple)'}`)
        }
    } catch (error: any) {
        console.log(`   ⚠️ Failed to check pools: ${error.shortMessage || error.message}`)
    }
}

async function main() {
    console.log('🔍 Checking Pool Assets\n')

    // Auto-fix missing 0x prefix in private key
    let pk = process.env.PRIVATE_KEY || ''
    if (!pk) {
        console.error('❌ ERROR: PRIVATE_KEY not found')
        process.exit(1)
    }
    if (!pk.startsWith('0x')) {
        pk = `0x${pk}`
    }

    const { privateKeyToAccount } = await import('viem/accounts')
    const account = privateKeyToAccount(pk as `0x${string}`)
    console.log(`  Account: ${account.address}`)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
    })

    await checkPools(client, OLD_CONTRACT, account.address, 'OLD Contract (LOCKED)')
    await checkPools(client, NEW_CONTRACT, account.address, 'NEW Contract (ACTIVE)')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error.message)
        process.exit(1)
    })
