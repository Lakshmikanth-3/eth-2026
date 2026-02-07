import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';

config();

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
});

async function main() {
    // User stated wallet
    const address = '0x43DDBD19381C8Ea8C1e4670d18DdB97c43fbEFDC';
    const balance = await client.getBalance({ address });
    console.log(`Address: ${address}`);
    console.log(`Balance: ${formatEther(balance)} ETH`);
}

main().catch(console.error);
