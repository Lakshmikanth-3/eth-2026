
import { createPublicClient, http, parseAbi, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import * as dotenv from 'dotenv'

dotenv.config()

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const FLASH_LP_ADDRESS = '0x4ffeb090ba98760deb7815f40e0d29b9a07fa819'

const MIN_ABI = parseAbi([
    'function pools(uint256) view returns (address, address, address, uint256, uint256, bool)'
])

async function main() {
    const client = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) })
    console.log('Reading Pool 1...')
    try {
        const data = await client.readContract({
            address: FLASH_LP_ADDRESS,
            abi: MIN_ABI,
            functionName: 'pools',
            args: [1n]
        })
        console.log('Result:', data)
    } catch (e) {
        console.error('Error:', e)
    }
}
main()
