import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
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

const MockERC20Artifact = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/MockERC20.sol/MockERC20.json'),
        'utf-8'
    )
)

async function main() {
    console.log('🏊 Creating Test Pool on Base Sepolia...\n')

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    const wallet = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    const flashLPAddress = deployments.baseSepolia.unifiedFlashLP as `0x${string}`

    console.log(`  Deployer: ${account.address}`)
    console.log(`  FlashLP: ${flashLPAddress}\n`)

    // Deploy two mock tokens for the pool
    console.log('1️⃣  Deploying Mock Tokens...')

    const token0Hash = await wallet.deployContract({
        abi: MockERC20Artifact.abi,
        bytecode: MockERC20Artifact.bytecode as `0x${string}`,
        args: ['Test Token A', 'TESTA', parseEther('1000000')]
    })
    const token0Receipt = await client.waitForTransactionReceipt({ hash: token0Hash })
    const token0Address = token0Receipt.contractAddress!
    console.log(`  ✅ Token A deployed: ${token0Address}`)

    const token1Hash = await wallet.deployContract({
        abi: MockERC20Artifact.abi,
        bytecode: MockERC20Artifact.bytecode as `0x${string}`,
        args: ['Test Token B', 'TESTB', parseEther('1000000')]
    })
    const token1Receipt = await client.waitForTransactionReceipt({ hash: token1Hash })
    const token1Address = token1Receipt.contractAddress!
    console.log(`  ✅ Token B deployed: ${token1Address}\n`)

    // Approve FlashLP to spend tokens
    console.log('2️⃣  Approving Token Spending...')

    const approveAmount = parseEther('10000')

    const approve0Hash = await wallet.writeContract({
        address: token0Address,
        abi: MockERC20Artifact.abi,
        functionName: 'approve',
        args: [flashLPAddress, approveAmount]
    })
    await client.waitForTransactionReceipt({ hash: approve0Hash })
    console.log(`  ✅ Approved Token A`)

    const approve1Hash = await wallet.writeContract({
        address: token1Address,
        abi: MockERC20Artifact.abi,
        functionName: 'approve',
        args: [flashLPAddress, approveAmount]
    })
    await client.waitForTransactionReceipt({ hash: approve1Hash })
    console.log(`  ✅ Approved Token B\n`)

    // Create the pool
    console.log('3️⃣  Creating Pool...')

    const poolAmount0 = parseEther('1000')
    const poolAmount1 = parseEther('1000')

    const createPoolHash = await wallet.writeContract({
        address: flashLPAddress,
        abi: UnifiedFlashLPArtifact.abi,
        functionName: 'createPool',
        args: [token0Address, token1Address, poolAmount0, poolAmount1]
    })

    console.log(`  Tx: ${createPoolHash}`)
    const createPoolReceipt = await client.waitForTransactionReceipt({ hash: createPoolHash })

    if (createPoolReceipt.status === 'success') {
        console.log(`  ✅ Pool Created!\n`)

        // Read nextPoolId to confirm
        const nextPoolId = await client.readContract({
            address: flashLPAddress,
            abi: UnifiedFlashLPArtifact.abi,
            functionName: 'nextPoolId'
        }) as bigint

        console.log(`📊 Pool ID: ${nextPoolId - 1n}`)
        console.log(`   Token A: ${token0Address}`)
        console.log(`   Token B: ${token1Address}`)
        console.log(`   Liquidity: ${poolAmount0} / ${poolAmount1}\n`)
        console.log('🎉 Pool ready for rental testing!')
        console.log('   Refresh your browser to see the new pool!')
    } else {
        throw new Error('Pool creation failed')
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    })
