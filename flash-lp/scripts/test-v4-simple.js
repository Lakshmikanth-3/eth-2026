const { createPublicClient, createWalletClient, http, parseUnits } = require('viem');
const { baseSepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Contract Addresses
const UNIFIED_FLASH_LP_V4 = '0xd2cc5a92f47f7b5cB726f58eCc4073c3F5dc00C5';
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH = '0x4200000000000000000000000000000000000006';

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
];

async function main() {
    console.log('🧪 Testing UnifiedFlashLPV4 - V4 Pool Creation\n');

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

    // Check Token Balances
    console.log('📊 Step 1: Checking Token Balances\n');

    const [usdcBalance, wethBalance, usdcDecimals, wethDecimals, usdcSymbol, wethSymbol] = await Promise.all([
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'balanceOf', args: [account.address] }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'decimals' }),
        publicClient.readContract({ address: USDC, abi: erc20ABI, functionName: 'symbol' }),
        publicClient.readContract({ address: WETH, abi: erc20ABI, functionName: 'symbol' })
    ]);

    const usdcAmount = Number(usdcBalance) / 10 ** Number(usdcDecimals);
    const wethAmount = Number(wethBalance) / 10 ** Number(wethDecimals);

    console.log(`${usdcSymbol} Balance: ${usdcAmount}`);
    console.log(`${wethSymbol} Balance: ${wethAmount}\n`);

    // Verify Contract
    console.log('📊 Step 2: Verifying Contract\n');

    const v4RouterAddr = await publicClient.readContract({
        address: UNIFIED_FLASH_LP_V4,
        abi: flashLPABI,
        functionName: 'v4Router'
    });

    console.log(`✅ V4Router: ${v4RouterAddr}`);
    console.log(`   Expected: ${V4_ROUTER}\n`);

    if (v4RouterAddr.toLowerCase() !== V4_ROUTER.toLowerCase()) {
        console.error(`❌ Router mismatch!`);
        return;
    }

    // Approve Tokens
    console.log('📊 Step 3: Token Approvals\n');

    const amount0 = parseUnits('10', Number(usdcDecimals));
    const amount1 = parseUnits('0.005', Number(wethDecimals));

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

    console.log(`USDC allowance: ${Number(usdcAllowance) / 10 ** Number(usdcDecimals)}`);
    console.log(`WETH allowance: ${Number(wethAllowance) / 10 ** Number(wethDecimals)}\n`);

    if (usdcAllowance < amount0) {
        console.log('📝 Approving USDC...');
        const hash = await walletClient.writeContract({
            address: USDC,
            abi: erc20ABI,
            functionName: 'approve',
            args: [UNIFIED_FLASH_LP_V4, parseUnits('1000', Number(usdcDecimals))]
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ USDC approved\n');
    }

    if (wethAllowance < amount1) {
        console.log('📝 Approving WETH...');
        const hash = await walletClient.writeContract({
            address: WETH,
            abi: erc20ABI,
            functionName: 'approve',
            args: [UNIFIED_FLASH_LP_V4, parseUnits('1', Number(wethDecimals))]
        });
        await publicClient.waitForTransactionReceipt({ hash });
        console.log('✅ WETH approved\n');
    }

    // Create V4 Pool
    console.log('📊 Step 4: Creating V4 Pool\n');

    const amount0V4 = parseUnits('20', Number(usdcDecimals));
    const amount1V4 = parseUnits('0.01', Number(wethDecimals));

    console.log(`Pool parameters:`);
    console.log(`  ${usdcSymbol}: 20`);
    console.log(`  ${wethSymbol}: 0.01`);
    console.log(`  Fee: 0.3%`);
    console.log(`  Tick Range: [-887220, 887220]\n`);

    if (usdcAmount >= 20 && wethAmount >= 0.01) {
        console.log('🚀 Creating V4 pool...');
        try {
            const hash = await walletClient.writeContract({
                address: UNIFIED_FLASH_LP_V4,
                abi: flashLPABI,
                functionName: 'createV4Pool',
                args: [USDC, WETH, amount0V4, amount1V4, 3000, -887220, 887220]
            });

            console.log(`Transaction: ${hash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            console.log(`\n✅ V4 pool created!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed}`);
            console.log(`   Status: ${receipt.status}\n`);

            console.log('🎉 Test Complete!');
        } catch (error) {
            console.error('\n❌ Pool creation failed:');
            console.error(error.shortMessage || error.message);
        }
    } else {
        console.log(`⚠️  Insufficient balance`);
        console.log(`   Need: 20 ${usdcSymbol} + 0.01 ${wethSymbol}`);
        console.log(`   Have: ${usdcAmount} ${usdcSymbol}, ${wethAmount} ${wethSymbol}\n`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Contract: ${UNIFIED_FLASH_LP_V4}`);
    console.log(`Balance: ${usdcAmount} ${usdcSymbol}, ${wethAmount} ${wethSymbol}`);
    console.log(`\nhttps://sepolia.basescan.org/address/${UNIFIED_FLASH_LP_V4}`);
}

main().catch(console.error);
