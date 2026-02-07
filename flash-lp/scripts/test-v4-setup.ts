import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// Contract addresses
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH = '0x4200000000000000000000000000000000000006';
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';
const POOL_MANAGER = '0x1b832D5395A41446b508632466cf32c6C07D63c7';

// ABIs
const erc20ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function approve(address,uint256) returns (bool)'
] as const;

const v4RouterABI = [
    'function manager() view returns (address)',
    'function addLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes) payable'
] as const;

async function main() {
    console.log('🧪 Testing V4 Integration Setup\n');

    const account = privateKeyToAccount(PRIVATE_KEY);
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

    console.log(`Account: ${account.address}\n`);

    // 1. Check balances
    console.log('📊 Checking Token Balances...');
    const [usdcBal, wethBal, usdcDec, wethDec] = await Promise.all([
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'decimals' })
    ]);

    console.log(`USDC: ${Number(usdcBal) / 10 ** usdcDec}`);
    console.log(`WETH: ${Number(wethBal) / 10 ** wethDec}\n`);

    // 2. Verify V4Router
    console.log('🔍 Verifying V4 Router...');
    const managerAddr = await publicClient.readContract({
        address: V4_ROUTER,
        abi: v4RouterABI,
        functionName: 'manager'
    });

    if (managerAddr.toLowerCase() !== POOL_MANAGER.toLowerCase()) {
        console.error(`❌ Router points to wrong PoolManager: ${managerAddr}`);
        return;
    }
    console.log(`✅ V4Router points to correct PoolManager\n`);

    // 3. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 V4 Setup Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ V4Router verified:  ${V4_ROUTER}`);
    console.log(`✅ PoolManager:        ${POOL_MANAGER}`);
    console.log(`✅ USDC balance:       ${Number(usdcBal) / 10 ** usdcDec}`);
    console.log(`✅ WETH balance:       ${Number(wethBal) / 10 ** wethDec}`);
    console.log('');
    console.log('🚀 Ready to deploy UnifiedFlashLPV4!');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Run: NETWORK=baseSepolia npx hardhat run scripts/deploy-v4-integration.ts --network baseSepolia');
    console.log('  2. Update frontend with new contract address');
    console.log('  3. Test createV4Pool function');
}

main().catch(console.error);
