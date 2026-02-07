import dotenv from 'dotenv'
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

// Ensure private key is properly formatted 32-byte hex
if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

// Contract ABIs - Using Hardhat artifact paths
// Note: We need to go up one level from scripts/ to root, then into contracts/artifacts
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

// Bytecode
const YellowChannelManagerBytecode = YellowChannelManagerArtifact.bytecode
const UnifiedFlashLPBytecode = UnifiedFlashLPArtifact.bytecode

interface DeploymentAddresses {
    yellowChannelManager: `0x${string}`
    unifiedFlashLP: `0x${string}`
    network: string
    chainId: number
    timestamp: string
}

async function deployToChain(chain: any, chainName: string, account: any) {
    console.log(`\n🚀 Deploying to ${chainName}...`)

    const publicClient = createPublicClient({
        chain,
        transport: http()
    })

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http()
    })

    console.log(`  Deployer: ${account.address}`)

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address })
    console.log(`  Balance: ${parseEther(balance.toString())} ETH`)

    if (balance < parseEther('0.01')) {
        console.warn(`  ⚠️  Low balance! Need at least 0.01 ETH for deployment`)
    }

    // 1. Deploy YellowChannelManager
    console.log(`\n  📝 Deploying YellowChannelManager...`)

    const yellowManagerHash = await walletClient.deployContract({
        abi: YellowChannelManagerABI,
        bytecode: YellowChannelManagerBytecode as `0x${string}`,
        args: []
    })

    console.log(`  Transaction: ${yellowManagerHash}`)

    const yellowManagerReceipt = await publicClient.waitForTransactionReceipt({
        hash: yellowManagerHash
    })

    const yellowManagerAddress = yellowManagerReceipt.contractAddress!
    console.log(`  ✅ YellowChannelManager deployed at: ${yellowManagerAddress}`)

    // 2. Deploy UnifiedFlashLP with YellowChannelManager address
    console.log(`\n  📝 Deploying UnifiedFlashLP...`)

    const flashLPHash = await walletClient.deployContract({
        abi: UnifiedFlashLPABI,
        bytecode: UnifiedFlashLPBytecode as `0x${string}`,
        args: [yellowManagerAddress]
    })

    console.log(`  Transaction: ${flashLPHash}`)

    const flashLPReceipt = await publicClient.waitForTransactionReceipt({
        hash: flashLPHash
    })

    const flashLPAddress = flashLPReceipt.contractAddress!
    console.log(`  ✅ UnifiedFlashLP deployed at: ${flashLPAddress}`)

    const deployment: DeploymentAddresses = {
        yellowChannelManager: yellowManagerAddress,
        unifiedFlashLP: flashLPAddress,
        network: chainName,
        chainId: chain.id,
        timestamp: new Date().toISOString()
    }

    return deployment
}

async function main() {
    console.log('🌟 Flash LP + Yellow Network Deployment Script')
    console.log('===============================================\n')

    const deployments: DeploymentAddresses[] = []

    // Deploy to Base Sepolia
    try {
        const baseDeployment = await deployToChain(baseSepolia, 'Base Sepolia', account)
        deployments.push(baseDeployment)
    } catch (error) {
        console.error('❌ Base Sepolia deployment failed:', error)
    }

    // Deploy to Arbitrum Sepolia
    try {
        const arbDeployment = await deployToChain(arbitrumSepolia, 'Arbitrum Sepolia', account)
        deployments.push(arbDeployment)
    } catch (error) {
        console.error('❌ Arbitrum Sepolia deployment failed:', error)
    }

    // Save deployment addresses
    const outputPath = path.join(__dirname, '../deployments.json')
    fs.writeFileSync(
        outputPath,
        JSON.stringify({ deployments }, null, 2)
    )

    console.log(`\n📄 Deployment addresses saved to: ${outputPath}`)

    // Print summary
    console.log('\n✨ Deployment Summary')
    console.log('===================\n')

    deployments.forEach(d => {
        console.log(`${d.network}:`)
        console.log(`  YellowChannelManager: ${d.yellowChannelManager}`)
        console.log(`  UnifiedFlashLP: ${d.unifiedFlashLP}`)
        console.log(`  Chain ID: ${d.chainId}`)
        console.log('')
    })

    console.log('🎉 Deployment complete!\n')

    // Generate environment variables
    console.log('📋 Add these to your .env file:')
    console.log('================================\n')

    deployments.forEach(d => {
        const prefix = d.network.toUpperCase().replace(/\s+/g, '_')
        console.log(`${prefix}_YELLOW_CHANNEL_MANAGER=${d.yellowChannelManager}`)
        console.log(`${prefix}_UNIFIED_FLASH_LP=${d.unifiedFlashLP}`)
    })
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
