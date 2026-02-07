import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`

// Contract Addresses - UPDATED to new contract with redeemPool
const UNIFIED_FLASH_LP_V4 = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c' as `0x${string}`
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
const WETH = '0x4200000000000000000000000000000000000006' as `0x${string}`

// Load ABI
const flashLPABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi

const erc20ABI = [
    {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        type: 'function'
    },
    {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        type: 'function'
    }
] as const

async function main() {
    console.log('🔓 Redeeming Pool Liquidity\n')

    // Auto-fix missing 0x prefix in private key
    let pk = PRIVATE_KEY
    if (!pk) {
        console.error('❌ ERROR: PRIVATE_KEY not found in environment variables')
        process.exit(1)
    }
    if (!pk.startsWith('0x')) {
        pk = `0x${pk}`
    }

    const account = privateKeyToAccount(pk as `0x${string}`)

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    })

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    })

    console.log(`Account: ${account.address}\n`)

    // Get owned pool IDs
    const poolIds = await publicClient.readContract({
        address: UNIFIED_FLASH_LP_V4,
        abi: flashLPABI,
        functionName: 'getOwnerPools',
        args: [account.address]
    }) as bigint[]

    if (poolIds.length === 0) {
        console.log('ℹ️  You have no pools to redeem.\n')
        console.log('Create a pool first using: npm run test:v4')
        return
    }

    console.log(`📊 You own ${poolIds.length} pool(s)\n`)

    // Get token info
    const [usdcDecimals, wethDecimals, usdcSymbol, wethSymbol] = await Promise.all([
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'symbol' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'symbol' })
    ])

    // Fetch each pool and redeem    
    for (const poolId of poolIds) {
        const pool = await publicClient.readContract({
            address: UNIFIED_FLASH_LP_V4,
            abi: flashLPABI,
            functionName: 'pools',
            args: [poolId]
        }) as any

        if (!pool.exists) {
            console.log(`Pool #${poolId}: Already redeemed\n`)
            continue
        }

        const amount0 = Number(formatUnits(pool.amount0, Number(usdcDecimals)))
        const amount1 = Number(formatUnits(pool.amount1, Number(wethDecimals)))

        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`Pool #${poolId}`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`Type: ${pool.isV4Pool ? 'V4 Pool' : 'Simple Pool'}`)
        console.log(`${usdcSymbol}: ${amount0}`)
        console.log(`${wethSymbol}: ${amount1}`)

        if (pool.isV4Pool) {
            console.log(`\n⚠️  Cannot redeem V4 pools (liquidity is in Uniswap V4)`)
            console.log(`   You need to withdraw from V4 first, then redeem\n`)
            continue
        }

        console.log(`\n🔓 Redeeming pool...`)

        try {
            const hash = await walletClient.writeContract({
                address: UNIFIED_FLASH_LP_V4,
                abi: flashLPABI,
                functionName: 'redeemPool',
                args: [poolId]
            })

            console.log(`Transaction: ${hash}`)
            const receipt = await publicClient.waitForTransactionReceipt({ hash })

            if (receipt.status === 'success') {
                console.log(`✅ Pool redeemed!`)
                console.log(`   You received: ${amount0} ${usdcSymbol} + ${amount1} ${wethSymbol}\n`)
            } else {
                console.error(`❌ Redemption failed\n`)
            }
        } catch (error: any) {
            console.error(`❌ Error:`, error.shortMessage || error.message)
            console.log()
        }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Contract: ${UNIFIED_FLASH_LP_V4}`)
    console.log(`\n🌐 View on BaseScan:`)
    console.log(`https://sepolia.basescan.org/address/${UNIFIED_FLASH_LP_V4}`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error.message)
        process.exit(1)
    })
