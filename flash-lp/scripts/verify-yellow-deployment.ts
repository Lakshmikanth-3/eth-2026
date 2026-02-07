import dotenv from 'dotenv'
import { ethers } from 'hardhat'
import { createPublicClient, createWalletClient, http, parseEther, isHex, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, arbitrumSepolia } from 'viem/chains'
import fs from 'fs'
import path from 'path'

dotenv.config()

let PRIVATE_KEY = process.env.PRIVATE_KEY as string

if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env')
}

if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

// Load artifacts
const YellowChannelManagerArtifact = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/YellowChannelManager.sol/YellowChannelManager.json'),
        'utf-8'
    )
)

const UnifiedFlashLPArtifact = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLP.sol/UnifiedFlashLP.json'),
        'utf-8'
    )
)

const YellowChannelManagerABI = YellowChannelManagerArtifact.abi
const UnifiedFlashLPABI = UnifiedFlashLPArtifact.abi

// Deployment addresses from previous step
const DEPLOYMENTS = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments.json'), 'utf-8')
).deployments

async function verifyOnChain(deployment: any) {
    console.log(`\n🔍 Verifying ${deployment.network}...`)

    const chain = deployment.chainId === 84532 ? baseSepolia : arbitrumSepolia
    const publicClient = createPublicClient({
        chain,
        transport: http()
    })

    // 1. Check YellowChannelManager code
    const yellowCode = await publicClient.getBytecode({
        address: deployment.yellowChannelManager as `0x${string}`
    })

    if (yellowCode && yellowCode.length > 2) {
        console.log(`  ✅ YellowChannelManager code exists at ${deployment.yellowChannelManager}`)
    } else {
        console.error(`  ❌ YellowChannelManager code missing at ${deployment.yellowChannelManager}`)
        return
    }

    // 2. Check UnifiedFlashLP code
    const flashLPCode = await publicClient.getBytecode({
        address: deployment.unifiedFlashLP as `0x${string}`
    })

    if (flashLPCode && flashLPCode.length > 2) {
        console.log(`  ✅ UnifiedFlashLP code exists at ${deployment.unifiedFlashLP}`)
    } else {
        console.error(`  ❌ UnifiedFlashLP code missing at ${deployment.unifiedFlashLP}`)
        return
    }

    // 3. Verify Integration (Yellow address in FlashLP)
    try {
        const storedYellowAddress = await publicClient.readContract({
            address: deployment.unifiedFlashLP as `0x${string}`,
            abi: UnifiedFlashLPABI,
            functionName: 'yellowChannelManager',
        })

        if ((storedYellowAddress as string).toLowerCase() === deployment.yellowChannelManager.toLowerCase()) {
            console.log(`  ✅ Integration verified: FlashLP points to correct YellowChannelManager`)
        } else {
            console.error(`  ❌ Integration mismatch: FlashLP points to ${storedYellowAddress}, expected ${deployment.yellowChannelManager}`)
        }
    } catch (error) {
        console.error(`  ❌ Failed to read yellowChannelManager from FlashLP:`, error)
    }
}

async function main() {
    console.log('🕵️  Verifying Yellow Network Integration Deployment')
    console.log('================================================\n')

    for (const deployment of DEPLOYMENTS) {
        await verifyOnChain(deployment)
    }

    console.log('\n✨ Verification Complete!')
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
