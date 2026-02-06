import { ethers } from "hardhat";

async function main() {
    console.log("📊 Rental Analytics Viewer\n");

    const [deployer] = await ethers.getSigners();

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let flashLPAddress;

    if (chainId === 421614) {
        flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055";
    } else if (chainId === 84532) {
        flashLPAddress = "0x72517E5D43abeF096BEB3A7a931E416A91b2A0c5";
    } else {
        throw new Error("Unsupported network");
    }

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    // Check all rentals for this account
    console.log(`Checking rentals for: ${deployer.address}\n`);

    const rentalIds = await flashLP.getRenterRentals(deployer.address);

    if (rentalIds.length === 0) {
        console.log("No rentals found for this account.");
        console.log("\n💡 To generate profits:");
        console.log("1. Go to the marketplace and rent a pool");
        console.log("2. Come back and run this script again");
        return;
    }

    console.log(`Found ${rentalIds.length} rental(s)\n`);
    console.log("═══════════════════════════════════════════\n");

    for (const rentalId of rentalIds) {
        const rental = await flashLP.getRental(rentalId);
        const profits = await flashLP.getRentalProfits(rentalId);
        const swaps = await flashLP.getSwapHistory(rentalId);

        console.log(`Rental #${rentalId}`);
        console.log(`─────────────────────────────────────────`);
        console.log(`Status: ${rental.isActive ? '🟢 Active' : '🔴 Ended'}`);
        console.log(`Pool ID: ${rental.poolId}`);
        console.log(`Swaps: ${rental.swapCount}`);
        console.log(`Volume: ${ethers.formatEther(rental.totalVolume)} ETH`);
        console.log(`\nProfit Breakdown:`);
        console.log(`  Fees Earned:   +${ethers.formatEther(profits.totalFeesEarned)} ETH`);
        console.log(`  Rental Cost:   -${ethers.formatEther(profits.rentalCostPaid)} ETH`);
        console.log(`  Est. Gas Cost: -${ethers.formatEther(profits.gasCostEstimate)} ETH`);
        console.log(`  ───────────────────────────────`);
        console.log(`  Net Profit:     ${ethers.formatEther(profits.netProfit)} ETH`);
        console.log(`  ROI:            ${Number(profits.roi) / 100}%`);

        if (swaps.length > 0) {
            console.log(`\nRecent Swaps:`);
            swaps.slice(0, 3).forEach((swap any, i: number) => {
                console.log(`  ${i + 1}. ${ethers.formatEther(swap.amountIn)} → ${ethers.formatEther(swap.amountOut)}`);
                console.log(`     Fee: ${ethers.formatEther(swap.feeCharged)} ETH | Cross-Chain: ${swap.isCrossChain ? 'Yes' : 'No'}`);
            });
        }

        console.log("\n═══════════════════════════════════════════\n");
    }

    console.log("\n✅ View full analytics at http://localhost:3000/analytics");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
