import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

// Constants
const CONTRACT = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c' as `0x${string}`
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`
const WETH = '0x4200000000000000000000000000000000000006' as `0x${string}`

// ABI
const flashLPABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi

const erc20ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    }
] as const

async function log(msg: string) {
    console.log(msg)
    fs.appendFileSync('result.txt', msg + '\n')
}

async function main() {
    fs.writeFileSync('result.txt', `Start: ${new Date().toISOString()}\n`)

    let pk = process.env.PRIVATE_KEY || ''
    if (!pk.startsWith('0x')) pk = `0x${pk}`
    const account = privateKeyToAccount(pk as `0x${string}`)

    const client = createPublicClient({ chain: baseSepolia, transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL) })
    const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL) })

    log(`Account: ${account.address}`)
    log(`Contract: ${CONTRACT}`)

    // Amounts
    const usdcAmount = parseUnits('0.1', 6)
    const wethAmount = parseUnits('0.001', 18)

    // Approve
    log('Approving USDC...')
    await wallet.writeContract({
        address: USDC, abi: erc20ABI, functionName: 'approve',
        args: [CONTRACT, usdcAmount * 10n]
    })
    log('Approving WETH...')
    await wallet.writeContract({
        address: WETH, abi: erc20ABI, functionName: 'approve',
        args: [CONTRACT, wethAmount * 10n]
    })

    log('Creating Simple Pool...')
    try {
        const hash = await wallet.writeContract({
            address: CONTRACT,
            abi: flashLPABI,
            functionName: 'createPool',
            args: [USDC, WETH, usdcAmount, wethAmount]
        })
        log(`Transaction sent: ${hash}`)

        await client.waitForTransactionReceipt({ hash })
        log('✅ SUCCESS: Pool Created')

    } catch (e: any) {
        log(`❌ FAIL: ${e.message}`)
    }
}

main().catch(e => log(`FATAL: ${e.message}`))
