import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, toHex, stringToHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

// Configuration
const CONTRACT_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

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

const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL)
});

// ABIs
const flashLPABI = JSON.parse(
    readFileSync(
        join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi;

const erc20ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    }
];

async function main() {
    console.log('🚀 Starting Swap Test (Rent -> Swap)');
    console.log(`User: ${account.address}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}`);

    // Params
    const poolId = 1n; // Using Pool #1
    const swapAmountUSDC = parseUnits('2', 6); // 2 USDC
    const duration = 3600n; // 1 hour
    const pricePerSecond = 0n; // Free rental for testing
    // Random channel ID
    const channelId = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    // 1. Check Pool
    console.log('\n🔍 Checking Pool #1...');
    const pool = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: flashLPABI,
        functionName: 'pools',
        args: [poolId]
    });

    // Check if V4 (should be false for this test)
    // Structure: [owner, token0, token1, amount0, amount1, exists, isV4Pool...]
    const isV4Pool = Array.isArray(pool) ? pool[6] : pool.isV4Pool;
    if (isV4Pool) {
        console.error('❌ Pool #1 is a V4 pool. This script is for Simple pools.');
        // If it is, user should swap on Uniswap V4, or find a simple pool.
        process.exit(1);
    }
    console.log('✅ Pool is Simple Pool. Proceeding.');

    // 2. Check Balance & Approve
    console.log('\n📝 Checking USDC Balance & Allowance...');
    const balance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [account.address]
    });
    console.log(`Balance: ${formatUnits(balance, 6)} USDC`);

    let amountToSwap = swapAmountUSDC;
    if (balance < swapAmountUSDC) {
        console.log(`⚠️  Insufficient balance for 2 USDC. Swapping 90% of balance instead.`);
        amountToSwap = (balance * 90n) / 100n;
        console.log(`New Swap Amount: ${formatUnits(amountToSwap, 6)} USDC`);
    }

    const allowance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20ABI,
        functionName: 'allowance',
        args: [account.address, CONTRACT_ADDRESS]
    });

    if (allowance < amountToSwap) {
        console.log('📝 Approving USDC for Swap...');
        const approveHash = await wallet.writeContract({
            address: USDC_ADDRESS,
            abi: erc20ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, parseUnits('1000', 6)] // Approve plenty
        });
        await client.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ USDC Approved');
    } else {
        console.log('✅ USDC Allowance Sufficient');
    }

    // 3. Rent Pool
    console.log('\n🏠 Renting Pool...');
    let rentalId;
    try {
        const rentHash = await wallet.writeContract({
            address: CONTRACT_ADDRESS,
            abi: flashLPABI,
            functionName: 'rentPool',
            args: [poolId, duration, pricePerSecond, channelId],
            value: 0n, // 0 collateral since price is 0
            maxPriorityFeePerGas: parseUnits('2', 9),
            maxFeePerGas: parseUnits('3', 9)
        });
        console.log(`Transaction sent: ${rentHash}`);

        const receipt = await client.waitForTransactionReceipt({ hash: rentHash });
        console.log('✅ Pool Rented!');

        // Find rentalId using getRenterRentals
        const rentals = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: flashLPABI,
            functionName: 'getRenterRentals',
            args: [account.address]
        });
        rentalId = rentals[rentals.length - 1];
        console.log(`Rental ID: ${rentalId}`);

    } catch (error) {
        console.error('❌ Error renting pool:', error.message || error);
        return;
    }

    // 4. Execute Swap (USDC -> WETH)
    console.log(`\n🔄 Executing Swap (${formatUnits(amountToSwap, 6)} USDC -> WETH)...`);
    try {
        const swapHash = await wallet.writeContract({
            address: CONTRACT_ADDRESS,
            abi: flashLPABI,
            functionName: 'executeSwap',
            args: [
                rentalId,
                USDC_ADDRESS, // tokenIn
                amountToSwap, // amountIn
                0n // minOut (slippage test)
            ],
            maxPriorityFeePerGas: parseUnits('2', 9),
            maxFeePerGas: parseUnits('3', 9)
        });
        console.log(`Transaction sent: ${swapHash}`);

        const swapReceipt = await client.waitForTransactionReceipt({ hash: swapHash });
        if (swapReceipt.status === 'success') {
            console.log('✅ Swap Successful!');
            console.log(`Gas used: ${swapReceipt.gasUsed}`);
        } else {
            console.error('❌ Swap Failed (Reverted)');
        }

    } catch (error) {
        console.error('❌ Error swapping:', error.message || error);
    }
}

main().catch(console.error);
