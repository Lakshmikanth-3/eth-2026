```
import dotenv from 'dotenv';
import { createPublicClient, createWalletClient, http, parseEther, parseUnits, isHex, toHex, keccak256, encodePacked } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import path from 'path'
import fs from 'fs'

dotenv.config();

let PRIVATE_KEY = process.env.PRIVATE_KEY as string
if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY
}
const account = privateKeyToAccount(PRIVATE_KEY as `0x${ string } `)

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

// Get deployments
const DEPLOYMENTS = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments.json'), 'utf-8')
).deployments

const baseDeployment = DEPLOYMENTS.find((d: any) => d.chainId === 84532)

if (!baseDeployment) {
    throw new Error('Base Sepolia deployment not found')
}

// Load MockERC20 Artifact
const MockERC20Artifact = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/MockERC20.sol/MockERC20.json'),
        'utf-8'
    )
)

async function main() {
    console.log('🧪 Testing Full Rental Flow with Yellow Integration')
    console.log('================================================\n')

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http()
    })

    const wallet = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http()
    })

    console.log(`  Tester: ${ account.address } `)

    try {
        // 0. Deploy Mock Tokens & Create Pool
        console.log('\n0️⃣  Setting up Pool...')

        // Deploy Token 0
        const token0Hash = await wallet.deployContract({
            abi: MockERC20Artifact.abi,
            bytecode: MockERC20Artifact.bytecode as `0x${ string } `,
            args: ['Mock Token A', 'MOCKA', parseEther('1000000000')] // 1B supply
        })
        console.log(`  Deploying Token A: ${ token0Hash } `)
        const token0Receipt = await client.waitForTransactionReceipt({ hash: token0Hash })
        const token0Address = token0Receipt.contractAddress!
        console.log(`  ✅ Token A deployed at: ${ token0Address } `)

        // Deploy Token 1
        const token1Hash = await wallet.deployContract({
            abi: MockERC20Artifact.abi,
            bytecode: MockERC20Artifact.bytecode as `0x${ string } `,
            args: ['Mock Token B', 'MOCKB', parseEther('1000000000')]
        })
        console.log(`  Deploying Token B: ${ token1Hash } `)
        const token1Receipt = await client.waitForTransactionReceipt({ hash: token1Hash })
        const token1Address = token1Receipt.contractAddress!
        console.log(`  ✅ Token B deployed at: ${ token1Address } `)

        // Approve tokens for FlashLP
        const flashLPAddress = baseDeployment.unifiedFlashLP as `0x${ string } `

        console.log(`  Approving FlashLP(${ flashLPAddress })...`)
        const approve0Hash = await wallet.writeContract({
            address: token0Address,
            abi: MockERC20Artifact.abi,
            functionName: 'approve',
            args: [flashLPAddress, parseEther('10000')]
        })
        await client.waitForTransactionReceipt({ hash: approve0Hash })

        const approve1Hash = await wallet.writeContract({
            address: token1Address,
            abi: MockERC20Artifact.abi,
            functionName: 'approve',
            args: [flashLPAddress, parseEther('10000')]
        })
        await client.waitForTransactionReceipt({ hash: approve1Hash })
        console.log('  ✅ Tokens Approved')

        // Create Pool
        const poolAmount0 = parseEther('1000')
        const poolAmount1 = parseEther('1000')

        console.log('  Creating Pool...')
        const createPoolHash = await wallet.writeContract({
            address: flashLPAddress,
            abi: UnifiedFlashLPArtifact.abi,
            functionName: 'createPool',
            args: [token0Address, token1Address, poolAmount0, poolAmount1]
        })
        console.log(`  Tx: ${ createPoolHash } `)
        const createPoolReceipt = await client.waitForTransactionReceipt({ hash: createPoolHash })

        if (createPoolReceipt.status !== 'success') {
            throw new Error('Pool creation transaction failed')
        }

        // Find PoolCreated event
        // PoolCreated(uint256 indexed poolId, ...)
        const poolCreatedTopic = '0x' + keccak256(toHex('PoolCreated(uint256,address,address,uint256,uint256,address)')).slice(2)

        const log = createPoolReceipt.logs.find(x => x.topics[0] === poolCreatedTopic)

        let poolId = 0n
        if (log && log.topics[1]) {
            poolId = BigInt(log.topics[1])
            console.log(`  ✅ PoolCreated Event Found! Pool ID: ${ poolId } `)
        } else {
            console.warn('  ⚠️ PoolCreated event not found in logs')
            // Fallback: Read nextPoolId - 1
            const nextPoolId = await client.readContract({
                address: flashLPAddress,
                abi: UnifiedFlashLPArtifact.abi,
                functionName: 'nextPoolId'
            }) as bigint
            poolId = nextPoolId - 1n
            console.log(`  Using inferred Pool ID: ${ poolId } `)
        }

        // Verify Pool Exists
        try {
            const pool = await client.readContract({
                address: flashLPAddress,
                abi: UnifiedFlashLPArtifact.abi,
                functionName: 'pools',
                args: [poolId]
            }) as any

            if (pool[0] === '0x0000000000000000000000000000000000000000') {
                throw new Error(`Pool ${ poolId } does not exist(token0 is zero address)`)
            }
            console.log(`  ✅ Pool ${ poolId } verified on - chain.Token0: ${ pool[0] } `)
        } catch (e) {
            console.error(`  ❌ Failed to verify pool ${ poolId }: `, e)
            return // Stop here
        }

        // 2. Create Yellow Channel for Rental
        console.log('\n1️⃣  Creating Yellow Channel...')
        const rentalId = BigInt(Math.floor(Date.now() / 1000))
        console.log(`  Rental ID: ${ rentalId } `)

        const deposit = parseEther('0.001')

        const createChannelHash = await wallet.writeContract({
            address: baseDeployment.yellowChannelManager as `0x${ string } `,
            abi: YellowChannelManagerArtifact.abi,
            functionName: 'createRentalChannel',
            args: [
                rentalId,
                account.address,
                account.address,
                3600n
            ],
            value: deposit
        })

        console.log(`  Tx: ${ createChannelHash } `)
        await client.waitForTransactionReceipt({ hash: createChannelHash })
        console.log('  ✅ Channel Created')

        // Get Channel ID
        const channelId = await client.readContract({
            address: baseDeployment.yellowChannelManager as `0x${ string } `,
            abi: YellowChannelManagerArtifact.abi,
            functionName: 'getRentalChannel',
            args: [rentalId]
        })
        console.log(`  Channel ID: ${ channelId } `)

        // 3. Rent Pool with Channel ID
        console.log('\n2️⃣  Renting Pool...')

        const rentHash = await wallet.writeContract({
            address: baseDeployment.unifiedFlashLP as `0x${ string } `,
            abi: UnifiedFlashLPArtifact.abi,
            functionName: 'rentPool',
            args: [
                poolId,
                3600n, // duration
                parseEther('0.000000001'), // price per second
                channelId
            ],
            value: parseEther('0.001') // collateral
        })

        console.log(`  Tx: ${ rentHash } `)
        await client.waitForTransactionReceipt({ hash: rentHash })
        console.log('  ✅ Rental Started with Yellow Channel')

        // 4. Settle Rental
        console.log('\n3️⃣  Settling Rental...')

        const finalBalance1 = parseEther('0.0005')
        const finalBalance2 = parseEther('0.0005')
        const nonce = 1n

        const messageHash = keccak256(
            encodePacked(
                ['bytes32', 'uint256', 'uint256', 'uint256', 'string'],
                [channelId as `0x${ string } `, finalBalance1, finalBalance2, nonce, 'close']
            )
        )

        const signature = await wallet.signMessage({
            message: { raw: messageHash }
        })

        const settleHash = await wallet.writeContract({
            address: baseDeployment.unifiedFlashLP as `0x${ string } `,
            abi: UnifiedFlashLPArtifact.abi,
            functionName: 'settleRentalWithYellow',
            args: [
                rentalId,
                finalBalance1,
                finalBalance2,
                nonce,
                signature,
                signature
            ]
        })

        console.log(`  Tx: ${ settleHash } `)
        await client.waitForTransactionReceipt({ hash: settleHash })
        console.log('  ✅ Rental Settled & Channel Closed')

        console.log('\n🎉 Full Flow Test Complete!')

    } catch (error) {
        console.error('\n❌ Test Failed:')
        console.error(error)
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
