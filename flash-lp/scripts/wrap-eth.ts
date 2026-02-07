import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'

dotenv.config()

// WETH contract address on Base Sepolia
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const

// Minimal WETH ABI - only need deposit and balanceOf
const WETH_ABI = [
    {
        "constant": false,
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const

async function main() {
    // Get amount from command line or default to 0.01 ETH
    const amountArg = process.argv[2] || '0.01'
    const amount = parseEther(amountArg)

    console.log('💧 Wrapping ETH to WETH on Base Sepolia...\n')

    // Auto-fix missing 0x prefix in private key
    let pk = process.env.PRIVATE_KEY || '';
    if (!pk) {
        console.error('❌ ERROR: PRIVATE_KEY not found in environment variables');
        process.exit(1);
    }
    if (!pk.startsWith('0x')) {
        pk = `0x${pk}`;
    }

    const account = privateKeyToAccount(pk as `0x${string}`)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    const wallet = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http('https://base-sepolia-rpc.publicnode.com')
    })

    console.log(`  Your Address: ${account.address}`)
    console.log(`  WETH Contract: ${WETH_ADDRESS}`)
    console.log(`  Amount to Wrap: ${formatEther(amount)} ETH\n`)

    // Check current balances
    console.log('📊 Current Balances:')
    const ethBalance = await client.getBalance({ address: account.address })
    const wethBalance = await client.readContract({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: 'balanceOf',
        args: [account.address]
    }) as bigint

    console.log(`  ETH: ${formatEther(ethBalance)}`)
    console.log(`  WETH: ${formatEther(wethBalance)}\n`)

    if (ethBalance < amount) {
        console.error('❌ Insufficient ETH balance!')
        process.exit(1)
    }

    // Wrap ETH
    console.log('🔄 Wrapping ETH...')
    const hash = await wallet.writeContract({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: 'deposit',
        value: amount
    })

    console.log(`  Tx: ${hash}`)
    console.log('  Waiting for confirmation...')

    const receipt = await client.waitForTransactionReceipt({ hash })

    if (receipt.status === 'success') {
        console.log('  ✅ Transaction confirmed!\n')

        // Check new balances
        console.log('📊 New Balances:')
        const newEthBalance = await client.getBalance({ address: account.address })
        const newWethBalance = await client.readContract({
            address: WETH_ADDRESS,
            abi: WETH_ABI,
            functionName: 'balanceOf',
            args: [account.address]
        }) as bigint

        console.log(`  ETH: ${formatEther(newEthBalance)}`)
        console.log(`  WETH: ${formatEther(newWethBalance)}`)

        console.log(`\n🎉 Successfully wrapped ${formatEther(amount)} ETH!`)
        console.log(`\n💡 You can now use WETH address in pool creation:`)
        console.log(`   ${WETH_ADDRESS}`)
    } else {
        console.error('❌ Transaction failed!')
        process.exit(1)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error.message)
        process.exit(1)
    })
