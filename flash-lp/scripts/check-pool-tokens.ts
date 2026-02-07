import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

const FLASH_LP_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org')
});

const loadABI = (name) => {
    const path = join(__dirname, `../contracts/artifacts/contracts/src/${name}.sol/${name}.json`);
    return JSON.parse(readFileSync(path, 'utf-8')).abi;
};

const flashLPABI = loadABI('UnifiedFlashLPV4');

async function main() {
    const poolId = 1n;
    const poolInfo = await client.readContract({
        address: FLASH_LP_ADDRESS,
        abi: flashLPABI,
        functionName: 'pools',
        args: [poolId]
    });
    // poolInfo: [owner, token0, token1, amount0, amount1, exists, ...]
    console.log(`Pool ${poolId}:`);
    console.log(`Token0: ${poolInfo[1]}`);
    console.log(`Token1: ${poolInfo[2]}`);
}

main().catch(console.error);
