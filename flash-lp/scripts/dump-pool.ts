import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const NEW_CONTRACT = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c' as `0x${string}`

const flashLPABI = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi

async function main() {
    console.log('🔍 Counting pools...')

    let pk = process.env.PRIVATE_KEY || ''
    if (!pk) { throw new Error('PRIVATE_KEY not found') }
    if (!pk.startsWith('0x')) { pk = `0x${pk}` }

    const { privateKeyToAccount } = await import('viem/accounts')
    const account = privateKeyToAccount(pk as `0x${string}`)

    const client = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL)
    })

    const poolIds = await client.readContract({
        address: NEW_CONTRACT,
        abi: flashLPABI,
        functionName: 'getOwnerPools',
        args: [account.address]
    }) as bigint[]

    if (poolIds.length === 0) {
        console.log('No pools found')
        fs.writeFileSync('pool-count.txt', '0')
        return
    }

    console.log(`Found ${poolIds.length} pools`)
    fs.writeFileSync('pool-count.txt', poolIds.length.toString())
}

main().catch(console.error)
