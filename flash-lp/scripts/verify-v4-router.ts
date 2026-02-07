import { createPublicClient, http, createWalletClient, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// V4 Contract Addresses (Base Sepolia)
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';
const POOL_MANAGER = '0x1b832D5395A41446b508632466cf32c6C07D63c7';
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH = '0x4200000000000000000000000000000000000006';

// Minimal ABIs
const routerABI = [
    'function manager() view returns (address)',
    'function addLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes) payable',
    'function swap((address,address,uint24,int24,address),(bool,int256,uint160),bytes) payable'
] as const;

const poolManagerABI = [
    'function getLiquidity(bytes32) view returns (uint128)',
    'function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)'
] as const;

async function main() {
    console.log('🦄 Verifying Uniswap V4 Router Setup on Base Sepolia\n');

    const account = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    console.log(`Account: ${account.address}\n`);

    // 1. Verify V4Router deployment
    console.log('📍 Step 1: Verify V4Router Address');
    const code = await publicClient.getBytecode({ address: V4_ROUTER });
    if (!code || code === '0x') {
        console.error('❌ V4Router not deployed at', V4_ROUTER);
        return;
    }
    console.log('✅ V4Router deployed\n');

    // 2. Verify it points to correct PoolManager
    console.log('📍 Step 2: Verify PoolManager Configuration');
    try {
        const managerAddress = await publicClient.readContract({
            address: V4_ROUTER,
            abi: routerABI,
            functionName: 'manager'
        });

        if (managerAddress.toLowerCase() !== POOL_MANAGER.toLowerCase()) {
            console.error(`❌ Router points to wrong PoolManager: ${managerAddress}`);
            console.error(`   Expected: ${POOL_MANAGER}`);
            return;
        }
        console.log('✅ PoolManager configured correctly\n');
    } catch (e) {
        console.error('❌ Failed to read manager:', e);
        return;
    }

    // 3. Check PoolManager deployment
    console.log('📍 Step 3: Verify PoolManager Deployment');
    const pmCode = await publicClient.getBytecode({ address: POOL_MANAGER });
    if (!pmCode || pmCode === '0x') {
        console.error('❌ PoolManager not deployed at', POOL_MANAGER);
        return;
    }
    console.log('✅ PoolManager deployed\n');

    // 4. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`V4Router:     ${V4_ROUTER}`);
    console.log(`PoolManager:  ${POOL_MANAGER}`);
    console.log(`USDC:         ${USDC}`);
    console.log(`WETH:         ${WETH}`);
    console.log('');
    console.log('✅ All V4 infrastructure verified!');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Integrate V4Router with UnifiedFlashLP');
    console.log('  2. Update createPool to use V4Router.addLiquidity');
    console.log('  3. Test pool creation flow');
}

main().catch(console.error);
