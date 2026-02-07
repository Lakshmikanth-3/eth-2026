import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

// Contract addresses
const YELLOW_CHANNEL_MANAGER = '0xD546eD7c2e35F52187Ab9160Ebd1Bf0713893be4'
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0'

// Load contract artifacts
const UnifiedFlashLPV4 = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
)

async function main() {
    console.log('🚀 Deploying UnifiedFlashLPV4 with Redemption Support\n')

    // Auto-fix missing 0x prefix in private key
    let pk = process.env.PRIVATE_KEY || ''
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
        transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
    })

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
    })

    console.log(`  Deployer: ${account.address}`)
    console.log(`  Network: Base Sepolia (Chain ID: 84532)`)
    console.log(`  YellowChannelManager: ${YELLOW_CHANNEL_MANAGER}`)
    console.log(`  V4Router: ${V4_ROUTER}\n`)

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address })
    console.log(`  ETH Balance: ${Number(balance) / 1e18} ETH\n`)

    if (balance < BigInt(1e16)) {
        console.error('❌ Insufficient ETH for deployment (need at least 0.01 ETH)')
        process.exit(1)
    }

    console.log('📝 Deploying UnifiedFlashLPV4...')

    try {
        const hash = await walletClient.deployContract({
            abi: UnifiedFlashLPV4.abi,
            bytecode: UnifiedFlashLPV4.bytecode as `0x${string}`,
            args: [YELLOW_CHANNEL_MANAGER, V4_ROUTER],
            account
        })

        console.log(`  Transaction: ${hash}`)
        console.log('  Waiting for confirmation...\n')

        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === 'success' && receipt.contractAddress) {
            console.log('✅ Deployment Successful!\n')
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log('📋 Deployment Details')
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log(`Contract: ${receipt.contractAddress}`)
            console.log(`Block: ${receipt.blockNumber}`)
            console.log(`Gas Used: ${receipt.gasUsed}`)
            console.log(`Transaction: ${hash}`)
            console.log()
            console.log(`🌐 View on BaseScan:`)
            console.log(`https://sepolia.basescan.org/address/${receipt.contractAddress}`)
            console.log()

            // Update deployments.json
            const deploymentsPath = path.join(__dirname, '../deployments.json')
            let deployments: any = {}

            if (fs.existsSync(deploymentsPath)) {
                deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'))
            }

            if (!deployments.baseSepolia) {
                deployments.baseSepolia = {}
            }

            deployments.baseSepolia.UnifiedFlashLPV4_v2 = {
                address: receipt.contractAddress,
                deployedAt: new Date().toISOString(),
                deployer: account.address,
                transactionHash: hash,
                blockNumber: Number(receipt.blockNumber),
                features: ['redeemPool', 'v4Integration', 'yellowChannel']
            }

            // Keep old contract reference
            deployments.baseSepolia.UnifiedFlashLPV4_v1_LOCKED = {
                address: '0xd2cc5a92f47f7b5cB726f58eCc4073c3F5dc00C5',
                note: 'Original contract - tokens are locked (no redeemPool function)'
            }

            fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2))

            console.log(`📝 Updated deployments.json`)
            console.log()
            console.log(`⚠️  NEXT STEPS:`)
            console.log(`1. Update src/lib/contracts.ts with new address:`)
            console.log(`   FlashLPV4: "${receipt.contractAddress}"`)
            console.log()
            console.log(`2. Test pool creation with the new contract`)
            console.log(`3. You can now use redeemPool() to withdraw liquidity!`)
            console.log()
            console.log(`💡 OLD CONTRACT (${deployments.baseSepolia.UnifiedFlashLPV4_v1_LOCKED.address}):`)
            console.log(`   Tokens are PERMANENTLY LOCKED - no recovery possible`)
        } else {
            console.error('❌ Deployment failed!')
            process.exit(1)
        }
    } catch (error: any) {
        console.error('\n❌ Deployment Error:', error.message)
        if (error.details) {
            console.error('Details:', error.details)
        }
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Fatal Error:', error.message)
        process.exit(1)
    })
