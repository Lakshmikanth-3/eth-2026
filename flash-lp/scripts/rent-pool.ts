import { createPublicClient, createWalletClient, http, parseUnits, toHex } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

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

const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL)
});

// ABI
const flashLPABI = JSON.parse(
    readFileSync(
        join(__dirname, '../contracts/artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json'),
        'utf-8'
    )
).abi;

async function main() {
    // Parse arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: npx tsx scripts/rent-pool.ts <poolId> [durationSeconds]');
        process.exit(1);
    }

    const poolId = BigInt(args[0]);
    const durationCount = args[1] ? BigInt(args[1]) : 3600n; // Default 1 hour

    console.log('\n🏠 Renting Pool');
    console.log('=================');
    console.log(`Pool ID:  ${poolId}`);
    console.log(`Duration: ${durationCount} seconds`);
    console.log(`User:     ${account.address}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}\n`);

    // Generate random channel ID for this rental
    const channelId = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    console.log(`Generated Channel ID: ${channelId}`);

    try {
        console.log('\n⏳ Sending transaction...');

        const rentHash = await wallet.writeContract({
            address: CONTRACT_ADDRESS,
            abi: flashLPABI,
            functionName: 'rentPool',
            args: [poolId, durationCount, 0n, channelId], // Price 0 for now
            value: 0n,
            maxPriorityFeePerGas: parseUnits('2', 9),
            maxFeePerGas: parseUnits('3', 9)
        });

        console.log(`Transaction sent: ${rentHash}`);
        console.log('Waiting for confirmation...');

        const receipt = await client.waitForTransactionReceipt({ hash: rentHash });

        if (receipt.status === 'success') {
            console.log('\n✅ Rental Successful!');
            console.log(`Block: ${receipt.blockNumber}`);
            console.log(`Gas Used: ${receipt.gasUsed}`);

            // Try to find Rental ID
            // We can query the last rental for the user
            const rentals = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: flashLPABI,
                functionName: 'getRenterRentals',
                args: [account.address]
            }) as bigint[];

            const newRentalId = rentals[rentals.length - 1];
            console.log(`\n🎉 New Rental ID: ${newRentalId}`);
        } else {
            console.error('\n❌ Transaction Reverted');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message || error);
    }
}

main().catch(console.error);
