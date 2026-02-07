import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';

config();

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
});

async function main() {
    const address = '0x43DDBD19381C8Ea8C1e4670d18DdB97c43fbEFDC';
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const erc20ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }];

    const balance = await client.readContract({
        address: usdcAddress,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address]
    });
    console.log(`Address: ${address}`);
    console.log(`USDC Balance: ${formatUnits(balance as bigint, 6)} USDC`);
}

main().catch(console.error);
