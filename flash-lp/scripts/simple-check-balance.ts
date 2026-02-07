import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';

config();

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
});

async function main() {
    // 0x8512140e4fAE7de38C9E7F65E364C47F619Fe430
    const balance = await client.getBalance({ address: '0x8512140e4fAE7de38C9E7F65E364C47F619Fe430' });
    console.log(`Balance: ${formatEther(balance)} ETH`);
}

main().catch(console.error);
