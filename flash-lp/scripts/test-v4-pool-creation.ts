import { createPublicClient, createWalletClient, http, parseUnits, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// Contract Addresses
const UNIFIED_FLASH_LP_V4 = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c' as `0x${string}`;
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0' as `0x${string}`;
const POOL_MANAGER = '0x1b832D5395A41446b508632466cf32c6C07D63c7' as `0x${string}`;
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
const WETH = '0x4200000000000000000000000000000000000006' as `0x${string}`;

// Load ABI
const artifactPath = path.join(process.cwd(), 'contracts', 'artifacts', 'contracts', 'src', 'UnifiedFlashLPV4.sol', 'UnifiedFlashLPV4.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const flashLPABI = artifact.abi;

const erc20ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

async function main() {
    console.log('🧪 Testing UnifiedFlashLPV4 - V4 Pool Creation\n');

    let pk = PRIVATE_KEY;

    if (!pk) {
        console.error('❌ ERROR: PRIVATE_KEY not found in environment variables\n');
        console.log('To fix this:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add your private key (with 0x prefix):');
        console.log('   PRIVATE_KEY=0x1234567890abcdef...\n');
        console.log('Or set it in your environment:');
        console.log('   $env:PRIVATE_KEY="0x1234567890abcdef..."\n');
        process.exit(1);
    }

    // Auto-fix missing 0x prefix
    if (!pk.startsWith('0x')) {
        console.log('⚠️  Note: Added missing 0x prefix to PRIVATE_KEY');
        pk = `0x${pk}`;
    }

    const account = privateKeyToAccount(pk as `0x${string}`);

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

    // ═══════════════════════════════════════════════════════
    // STEP 1: Check Token Balances
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 1: Checking Token Balances\n');

    const [usdcBalance, wethBalance, ethBalance, usdcDecimals, wethDecimals, usdcSymbol, wethSymbol] = await Promise.all([
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.getBalance({ address: account.address }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'symbol' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'symbol' })
    ]);

    const usdcAmount = Number(usdcBalance) / 10 ** Number(usdcDecimals);
    const wethAmount = Number(wethBalance) / 10 ** Number(wethDecimals);

    const ethAmount = Number(formatEther(ethBalance));

    console.log(`${usdcSymbol} Balance: ${usdcAmount}`);
    console.log(`${wethSymbol} Balance: ${wethAmount}`);
    console.log(`ETH (Native): ${ethAmount}\n`);

    if (usdcAmount < 1.0 || wethAmount < 0.001) {
        console.log('⚠️  Warning: Insufficient tokens for V4 pool');
        if (wethAmount < 0.001 && ethAmount > 0.001) {
            console.log('   💡 Tip: You have ETH but need WETH. You can wrap it using a DEX or helper script.');
        }
        console.log('   Needed: 1.0 USDC + 0.001 WETH\n');
    }

    // ═══════════════════════════════════════════════════════
    // STEP 2: Verify Contract Deployment
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 2: Verifying UnifiedFlashLPV4 Deployment\n');

    const v4RouterAddr = await publicClient.readContract({
        address: UNIFIED_FLASH_LP_V4,
        abi: flashLPABI,
        functionName: 'v4Router'
    }) as `0x${string}`;

    const yellowMgrAddr = await publicClient.readContract({
        address: UNIFIED_FLASH_LP_V4,
        abi: flashLPABI,
        functionName: 'yellowChannelManager'
    }) as `0x${string}`;

    console.log(`✅ V4Router: ${v4RouterAddr}`);
    console.log(`✅ YellowChannelManager: ${yellowMgrAddr}\n`);

    if (v4RouterAddr.toLowerCase() !== V4_ROUTER.toLowerCase()) {
        console.error(`❌ V4Router mismatch! Expected ${V4_ROUTER}`);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // STEP 3: Approve Tokens
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 3: Checking Token Approvals\n');

    const amount0 = parseUnits('0.1', Number(usdcDecimals)); // 0.1 USDC
    const amount1 = parseUnits('0.0001', Number(wethDecimals)); // 0.0001 WETH

    const [usdcAllowance, wethAllowance] = await Promise.all([
        publicClient.readContract({
            address: USDC,
            abi: erc20ABI,
            functionName: 'allowance',
            args: [account.address, UNIFIED_FLASH_LP_V4]
        }),
        publicClient.readContract({
            address: WETH,
            abi: erc20ABI,
            functionName: 'allowance',
            args: [account.address, UNIFIED_FLASH_LP_V4]
        })
    ]);

    console.log(`Current USDC allowance: ${Number(usdcAllowance) / 10 ** Number(usdcDecimals)}`);
    console.log(`Current WETH allowance: ${Number(wethAllowance) / 10 ** Number(wethDecimals)}\n`);

    // Approve if needed
    const limit = parseUnits('1000', 18);
    if (usdcAllowance < limit) {
        console.log('📝 Approving USDC...');
        const approveHash = await walletClient.writeContract({
            address: USDC,
            abi: erc20ABI,
            functionName: 'approve',
            args: [UNIFIED_FLASH_LP_V4, parseUnits('1000', Number(usdcDecimals))]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ USDC approved\n');
    }

    if (wethAllowance < limit) {
        console.log('📝 Approving WETH...');
        const approveHash = await walletClient.writeContract({
            address: WETH,
            abi: erc20ABI,
            functionName: 'approve',
            args: [UNIFIED_FLASH_LP_V4, parseUnits('1', Number(wethDecimals))]
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ WETH approved\n');
    }

    // ═══════════════════════════════════════════════════════
    // STEP 4: Create Simple Pool
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 4: Creating Simple Pool\n');

    console.log(`Creating simple pool with:`);
    console.log(`  ${usdcSymbol}: 0.1`);
    console.log(`  ${wethSymbol}: 0.001\n`);

    if (usdcAmount >= 0.1 && wethAmount >= 0.001) {
        console.log('🚀 Creating simple pool...');
        try {
            console.log('   Sending transaction...');
            const createPoolHash = await walletClient.writeContract({
                address: UNIFIED_FLASH_LP_V4,
                abi: flashLPABI,
                functionName: 'createPool',
                args: [USDC, WETH, amount0, amount1],
                maxPriorityFeePerGas: parseUnits('2', 9), // 2 Gwei priority
                maxFeePerGas: parseUnits('3', 9) // 3 Gwei max
            });

            console.log(`Transaction: ${createPoolHash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: createPoolHash });
            console.log(`✅ Simple pool created in block ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed}\n`);
        } catch (error: any) {
            console.error('❌ Simple pool creation failed:', error.shortMessage || error.message);
        }
    } else {
        console.log('⚠️  Skipping simple pool - insufficient balance\n');
    }

    // ═══════════════════════════════════════════════════════
    // STEP 5: Create V4 Pool
    // ═══════════════════════════════════════════════════════
    console.log('📊 Step 5: Creating V4 Pool\n');

    const amount0V4 = parseUnits('1.0', Number(usdcDecimals));
    const amount1V4 = parseUnits('0.001', Number(wethDecimals));
    const fee = 3000;
    const tickLower = -887220;
    const tickUpper = 887220;

    console.log(`Creating V4 pool with:`);
    console.log(`  ${usdcSymbol}: 1.0`);
    console.log(`  ${wethSymbol}: 0.001`);
    console.log(`  Fee: ${fee / 10000}%`);
    console.log(`  Tick Range: [${tickLower}, ${tickUpper}]\n`);

    if (usdcAmount >= 1.0 && wethAmount >= 0.001) {
        console.log('🚀 Creating V4 pool...');
        try {
            console.log('   Sending transaction...');
            const createV4PoolHash = await walletClient.writeContract({
                address: UNIFIED_FLASH_LP_V4,
                abi: flashLPABI,
                functionName: 'createV4Pool',
                args: [USDC, WETH, amount0V4, amount1V4, fee, tickLower, tickUpper],
                maxPriorityFeePerGas: parseUnits('2', 9), // 2 Gwei priority
                maxFeePerGas: parseUnits('3', 9) // 3 Gwei max
            });

            console.log(`Transaction: ${createV4PoolHash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: createV4PoolHash });

            console.log(`\n✅ V4 pool created successfully!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed}`);
            console.log(`   Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}\n`);

            console.log('🎉 V4 Integration Test Complete!');
            console.log('   Your pool is now providing liquidity to Uniswap V4!');
        } catch (error: any) {
            console.error('\n❌ V4 pool creation failed');
            console.error('Error:', error.shortMessage || error.message);
            if (error.details) {
                console.error('Details:', error.details);
            }
        }
    } else {
        console.log('⚠️  Skipping V4 pool - conditions not met');
        console.log(`   USDC: ${usdcAmount} >= 1.0? ${usdcAmount >= 1.0}`);
        console.log(`   WETH: ${wethAmount} >= 0.001? ${wethAmount >= 0.001}\n`);
    }

    // ═══════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Contract: ${UNIFIED_FLASH_LP_V4}`);
    console.log(`V4Router: ${V4_ROUTER}`);
    console.log(`PoolManager: ${POOL_MANAGER}`);
    console.log(`Your Balance: ${usdcAmount} ${usdcSymbol}, ${wethAmount} ${wethSymbol}`);
    console.log('');
    console.log('🌐 View on BaseScan:');
    console.log(`https://sepolia.basescan.org/address/${UNIFIED_FLASH_LP_V4}`);
}

main().catch(console.error);
