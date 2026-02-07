const { createPublicClient, http, formatUnits, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
require('dotenv').config();

// Configuration
const CONTRACT_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';
const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env');
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL)
});

// Minimal ABI
const ABI = parseAbi([
    'function getOwnerPools(address owner) external view returns (uint256[])',
    'function pools(uint256 poolId) external view returns (address owner, address token0, address token1, uint256 amount0, uint256 amount1, bool exists, bool isV4Pool, uint24 v4Fee, int24 v4TickLower, int24 v4TickUpper)'
]);

async function main() {
    console.log('\n📊 Checking Locked Value in Pools');
    console.log('=================================');
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Owner:    ${account.address}\n`);

    try {
        const poolIds = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'getOwnerPools',
            args: [account.address]
        });

        if (poolIds.length === 0) {
            console.log('No pools found.');
            return;
        }

        console.log(`Found ${poolIds.length} pools. Fetching details...\n`);

        let totalUSDC = 0;
        let totalWETH = 0;

        for (const poolId of poolIds) {
            const pool = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'pools',
                args: [poolId]
            });

            // Handle both array (viem default for unnamed) and object (if ABI has names) return styles
            // Struct: { owner, token0, token1, amount0, amount1, exists, isV4Pool, ... }
            const isArray = Array.isArray(pool);

            const token0 = isArray ? pool[1] : pool.token0;
            const token1 = isArray ? pool[2] : pool.token1;
            const amount0 = isArray ? pool[3] : pool.amount0;
            const amount1 = isArray ? pool[4] : pool.amount1;
            const isV4Pool = isArray ? pool[6] : pool.isV4Pool;

            const usdc = parseFloat(formatUnits(amount0, 6));
            const weth = parseFloat(formatUnits(amount1, 18));

            totalUSDC += usdc;
            totalWETH += weth;

            console.log(`Pool #${poolId} [${isV4Pool ? 'V4' : 'Simple'}]`);
            console.log(`  ID:       ${poolId} (On-chain Identifier)`);
            console.log(`  Contract: ${CONTRACT_ADDRESS}`);
            console.log(`  Tokens:   ${token0} / ${token1}`);
            console.log(`  Locked:   ${usdc.toFixed(2)} USDC + ${weth.toFixed(6)} WETH`);
            console.log('---------------------------------');
        }

        console.log('\n💰 TOTAL LOCKED VALUE');
        console.log(`   ${totalUSDC.toFixed(2)} USDC`);
        console.log(`   ${totalWETH.toFixed(6)} WETH`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
