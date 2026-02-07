import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

// Configuration
const CONTRACT_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

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

// Minimal Rental Struct ABI
const rentalABI = [
    {
        name: 'rentals',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'rentalId', type: 'uint256' }],
        outputs: [
            { name: 'poolId', type: 'uint256' },
            { name: 'renter', type: 'address' },
            { name: 'poolOwner', type: 'address' },
            { name: 'startTime', type: 'uint256' },
            { name: 'endTime', type: 'uint256' },
            { name: 'pricePerSecond', type: 'uint256' },
            { name: 'collateral', type: 'uint256' },
            { name: 'isActive', type: 'bool' },
            { name: 'swapCount', type: 'uint256' },
            { name: 'feesEarned', type: 'uint256' },
            { name: 'channelId', type: 'bytes32' }
        ]
    }
];

async function main() {
    // Parse arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: npx tsx scripts/swap-with-fee.ts <rentalId> [amountUSDC]');
        process.exit(1);
    }

    const rentalId = BigInt(args[0]);
    let desiredAmount = args[1] ? parseUnits(args[1], 6) : parseUnits('1', 6);

    console.log('\n🔄 Executing Swap on Rental');
    console.log('===========================');
    console.log(`Rental ID: ${rentalId}`);
    console.log(`User:      ${account.address}`);

    // 1. Check Initial Fee State
    console.log('\n📊 Checking Initial Fee State...');
    const initialRental = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: rentalABI, // Use specific ABI to ensure object return if possible, or mapping
        functionName: 'rentals',
        args: [rentalId]
    });

    // Viem returns array for struct if standard ABI used without names object mapping preference
    // Based on previous findings:
    // 0: poolId, 1: renter, ... 9: feesEarned

    // Let's use our discovered mapping
    const initialFees = Array.isArray(initialRental) ? initialRental[9] : initialRental.feesEarned;
    console.log(`Initial Fees Earned: ${formatUnits(initialFees, 6)} USDC`);

    // 2. Check Balance & Adjust Amount
    const balance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [account.address]
    });

    console.log(`Wallet Balance: ${formatUnits(balance, 6)} USDC`);

    let amountToSwap = desiredAmount;
    if (balance < desiredAmount) {
        console.log(`⚠️  Insufficient balance. Swapping 90% of wallet balance.`);
        amountToSwap = (balance * 90n) / 100n;
    }

    if (amountToSwap === 0n) {
        console.error('❌ Balance too low to swap.');
        process.exit(1);
    }

    console.log(`Swap Amount:    ${formatUnits(amountToSwap, 6)} USDC`);

    // 3. Approve if needed
    const allowance = await client.readContract({
        address: USDC_ADDRESS,
        abi: erc20ABI,
        functionName: 'allowance',
        args: [account.address, CONTRACT_ADDRESS]
    });

    if (allowance < amountToSwap) {
        console.log('📝 Approving USDC...');
        const approveHash = await wallet.writeContract({
            address: USDC_ADDRESS,
            abi: erc20ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS, parseUnits('1000', 6)]
        });
        await client.waitForTransactionReceipt({ hash: approveHash });
        console.log('✅ Approved');
    }

    // 4. Executing Swap
    console.log('\n💸 Sending Swap Transaction...');
    try {
        const swapHash = await wallet.writeContract({
            address: CONTRACT_ADDRESS,
            abi: flashLPABI,
            functionName: 'executeSwap',
            args: [
                rentalId,
                USDC_ADDRESS,
                amountToSwap,
                0n // Min out 0
            ],
            maxPriorityFeePerGas: parseUnits('2', 9),
            maxFeePerGas: parseUnits('3', 9)
        });

        console.log(`Transaction: ${swapHash}`);
        const receipt = await client.waitForTransactionReceipt({ hash: swapHash });

        if (receipt.status !== 'success') {
            console.error('❌ Transaction Reverted');
            return;
        }

        console.log(`✅ Swap Complete (Block ${receipt.blockNumber})`);
        console.log(`Gas Used: ${receipt.gasUsed}`);

    } catch (error) {
        console.error('❌ Error executing swap:', error.message || error);
        return;
    }

    // 5. Check Final Fee State
    const finalFeesRaw = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: rentalABI,
        functionName: 'rentals',
        args: [rentalId]
    });

    // Use same indexing logic
    const finalFees = Array.isArray(finalFeesRaw) ? finalFeesRaw[9] : (finalFeesRaw.feesEarned !== undefined ? finalFeesRaw.feesEarned : 0n);
    const feeDelta = finalFees - initialFees;

    console.log(`\nFinal Fees Earned:   ${formatUnits(finalFees, 6)} USDC`);
    console.log(`💰 Fee Collected:     ${formatUnits(feeDelta, 6)} USDC`);

    let report = `SWAP REPORT\n===========\n`;
    report += `Rental ID:     ${rentalId}\n`;
    report += `Swap Amount:   ${formatUnits(amountToSwap, 6)} USDC\n`;
    report += `Initial Fees:  ${formatUnits(initialFees, 6)} USDC\n`;
    report += `Final Fees:    ${formatUnits(finalFees, 6)} USDC\n`;
    report += `Fee Collected: ${formatUnits(feeDelta, 6)} USDC\n`;

    if (feeDelta > 0n) {
        console.log('🎉 SUCCESS: Rental fee correctly accrued!');
        report += `Status: SUCCESS\n`;
    } else {
        console.log('⚠️  Warning: No fee accrued.');
        report += `Status: NO FEE ACCRUED\n`;
    }

    const { writeFileSync } = require('fs');
    writeFileSync('swap_report.txt', report);
}

main().catch(console.error);
