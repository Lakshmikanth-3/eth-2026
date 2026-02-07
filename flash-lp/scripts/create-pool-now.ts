import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = '0x612Bc96a6354E9b14d59FB899bE3DE8fF4F1Af01' // Base Sepolia

const FLASH_LP_ABI = [
    {
        "inputs": [
            { "name": "token0", "type": "address" },
            { "name": "token1", "type": "address" },
            { "name": "amount0", "type": "uint256" },
            { "name": "amount1", "type": "uint256" }
        ],
        "name": "createPool",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const

async function createTestPool() {
    console.log('🏊 Creating a test pool on Base Sepolia...\n')

    const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`
    if (!PRIVATE_KEY) {
        throw new Error('❌ PRIVATE_KEY not found in .env file')
    }

    const account = privateKeyToAccount(PRIVATE_KEY)
    console.log('✓ Using wallet:', account.address)

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
    })

    const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: http(),
        account
    })

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address })
    console.log('✓ Wallet balance:', (Number(balance) / 1e18).toFixed(4), 'ETH\n')

    if (balance === 0n) {
        console.log('⚠️  Your wallet has 0 ETH!')
        console.log('Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia')
        return
    }

    // Token addresses on Base Sepolia
    const token0 = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // USDC
    const token1 = '0x4200000000000000000000000000000000000006' // WETH

    console.log('Creating pool with:')
    console.log('  Token 0 (USDC):', token0)
    console.log('  Token 1 (WETH):', token1)
    console.log('  Amount 0: 0 (testing)')
    console.log('  Amount 1: 0 (testing)\n')

    try {
        console.log('Submitting transaction...')
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS,
            abi: FLASH_LP_ABI,
            functionName: 'createPool',
            args: [
                token0 as `0x${string}`,
                token1 as `0x${string}`,
                0n,
                0n
            ]
        })

        console.log('✓ Transaction submitted!')
        console.log('  Hash:', hash)
        console.log('  Explorer: https://sepolia.basescan.org/tx/' + hash)
        console.log('\nWaiting for confirmation...')

        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === 'success') {
            console.log('\n✅ SUCCESS! Pool created!')
            console.log('  Block:', receipt.blockNumber)
            console.log('  Gas used:', receipt.gasUsed.toString())
            console.log('\n🎉 Your pool is now live on the marketplace!')
            console.log('   Refresh http://localhost:3000/marketplace to see it\n')
        } else {
            console.log('\n❌ Transaction failed')
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message)

        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia')
        }
    }
}

createTestPool()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
