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

// Minimal ABI matching the contract struct exactly
const ABI = parseAbi([
    'function getRenterRentals(address renter) external view returns (uint256[])',
    'function rentals(uint256 rentalId) external view returns (uint256 poolId, address renter, address poolOwner, uint256 startTime, uint256 endTime, uint256 pricePerSecond, uint256 collateral, bool isActive, uint256 swapCount, uint256 feesEarned, bytes32 channelId)'
]);

const fs = require('fs');

async function main() {
    const args = process.argv.slice(2);
    const specificRentalId = args[0];
    let output = '';

    function log(msg) {
        console.log(msg);
        output += msg + '\n';
    }

    log('\n🔍 Checking Rental Status');
    log('=======================');
    log(`Contract: ${CONTRACT_ADDRESS}`);
    log(`Renter:   ${account.address}\n`);

    try {
        let rentalIds = [];

        if (specificRentalId) {
            rentalIds = [BigInt(specificRentalId)];
            log(`Checking specific Rental ID: ${specificRentalId}`);
        } else {
            log('Fetching all rentals for this account...');
            rentalIds = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'getRenterRentals',
                args: [account.address]
            });
        }

        if (rentalIds.length === 0) {
            log('No rentals found.');
            fs.writeFileSync('rental_report.txt', output);
            return;
        }

        log(`Found ${rentalIds.length} rentals.${specificRentalId ? '' : ' Showing latest 5:'}\n`);

        const idsToShow = specificRentalId ? rentalIds : rentalIds.slice(-5).reverse();

        for (const rentalId of idsToShow) {
            const rental = await client.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: 'rentals',
                args: [rentalId]
            });

            // Struct: { poolId, renter, poolOwner, startTime, endTime, pricePerSecond, collateral, isActive, swapCount, feesEarned, channelId }
            // Viem returns array because names are in ABI but let's be safe and use array indices or properties

            // Try object access first if viem returns object
            const poolId = rental.poolId !== undefined ? rental.poolId : rental[0];
            // const renter = rental.renter ?? rental[1]; // Unused
            const startTime = Number(rental.startTime !== undefined ? rental.startTime : rental[3]);
            const endTime = Number(rental.endTime !== undefined ? rental.endTime : rental[4]);
            const isActive = rental.isActive !== undefined ? rental.isActive : rental[7];
            const channelId = rental.channelId !== undefined ? rental.channelId : rental[10];

            const now = Math.floor(Date.now() / 1000);
            const remaining = endTime - now;

            // Verify isActive logic locally or trust contract
            // Contract `isActive` is explicitly stored.

            const statusLabel = isActive ? '🟢 ACTIVE' : (remaining > 0 ? '⚠️ INACTIVE (But time left?)' : '🔴 EXPIRED');

            log(`Rental #${rentalId}`);
            log(`  Status:      ${statusLabel}`);
            log(`  Pool ID:     ${poolId}`);
            log(`  Start Time:  ${new Date(startTime * 1000).toLocaleString()}`);
            log(`  End Time:    ${new Date(endTime * 1000).toLocaleString()} (${remaining > 0 ? remaining + 's left' : 'Expired'})`);
            log(`  Channel ID:  ${channelId}`);
            log('---------------------------------');
        }

    } catch (error) {
        log('Error: ' + error.message);
    }

    fs.writeFileSync('rental_report.txt', output);
}

main();
