
import { createPublicClient, http, parseAbi, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'

dotenv.config()

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const FLASH_LP_ADDRESS = '0x4ffeb090ba98760deb7815f40e0d29b9a07fa819' // Updated address

const MIN_ABI = parseAbi([
    'function pools(uint256) view returns (address owner, address token0, address token1, uint256 amount0, uint256 amount1, bool exists)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)'
])

async function main() {
    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    })

    console.error('🔍 Checking Liquidity Pools on Base Sepolia...')
    console.error(`Contract: ${FLASH_LP_ADDRESS}`)
    console.error('---------------------------------------------------')

    let poolId = 1
    let activePools = 0

    while (true) {
        try {
            console.error(`Checking Pool ID: ${poolId}...`)
            const pool = await client.readContract({
                address: FLASH_LP_ADDRESS,
                abi: MIN_ABI,
                functionName: 'pools',
                args: [BigInt(poolId)] // Explicitly cast to BigInt
            })

            const [owner, token0, token1, amount0, amount1, exists] = pool
            console.error(`Pool ${poolId} exists: ${exists}`)

            if (!exists) {
                if (poolId === 1) console.error('❌ No pools found starting from ID 1.')
                break
            }

            console.error(`Fetching token details for ${token0} and ${token1}...`)

            // Fetch token details sequentially to debug
            let sym0 = 'UNK', dec0 = 18
            try {
                sym0 = await client.readContract({ address: token0, abi: MIN_ABI, functionName: 'symbol' })
                dec0 = await client.readContract({ address: token0, abi: MIN_ABI, functionName: 'decimals' })
            } catch (e) {
                console.error('Failed token0 details', e)
            }

            let sym1 = 'UNK', dec1 = 18
            try {
                sym1 = await client.readContract({ address: token1, abi: MIN_ABI, functionName: 'symbol' })
                dec1 = await client.readContract({ address: token1, abi: MIN_ABI, functionName: 'decimals' })
            } catch (e) {
                console.error('Failed token1 details', e)
            }

            const fmt0 = formatUnits(amount0, dec0)
            const fmt1 = formatUnits(amount1, dec1)

            console.error(`\n🏊 Pool #${poolId}`)
            console.error(`   Owner:  ${owner}`)
            console.error(`   Token0: ${sym0} (${token0})`)
            console.error(`   Token1: ${sym1} (${token1})`)
            console.error(`   Liquidity:`)
            console.error(`     - ${fmt0} ${sym0}`)
            console.error(`     - ${fmt1} ${sym1}`)

            // Calculate Equivalence (Price)
            let price = 'N/A'
            if (parseFloat(fmt0) > 0) {
                price = (parseFloat(fmt1) / parseFloat(fmt0)).toFixed(6)
                console.error(`   Equivalence: 1 ${sym0} = ${price} ${sym1}`)
            } else {
                console.error(`   Equivalence: N/A (Empty Pool)`)
            }

            activePools++
            poolId++

            if (poolId > 10) break // Limit to 10 for now

        } catch (error) {
            //   console.error('Error fetching pool:', error)
            break // Assume end of pools if revert
        }
    }

    console.error('---------------------------------------------------')
    console.error(`✅ Found ${activePools} active pools.`)
    process.exit(0)
}

main().catch(console.error)
