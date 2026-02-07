const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // NEW contract address
    const flashLP = await hre.ethers.getContractAt(
        "FlashLP",
        "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567"
    );

    const rentals = await flashLP.getRenterRentals(deployer.address);
    console.log("Hardhat Wallet:", deployer.address);
    console.log(`Total Rentals on NEW contract: ${rentals.length}\n`);

    if (rentals.length === 0) {
        console.log("❌ No rentals found on NEW contract!");
        return;
    }

    for (let i = 0; i < rentals.length; i++) {
        const rental = await flashLP.getRental(rentals[i]);
        const profits = await flashLP.getRentalProfits(rentals[i]);

        console.log(`═══════════════════════════════════`);
        console.log(`Rental #${rentals[i]}:`);
        console.log(`  Pool ID: ${rental.poolId}`);
        console.log(`  Active: ${rental.isActive}`);
        console.log(`  Swap Count: ${rental.swapCount} ${rental.swapCount > 0 ? '✅' : '❌'}`);
        console.log(`  Total Volume: ${hre.ethers.formatEther(rental.totalVolume)} ETH`);
        console.log(`  Fees Earned: ${hre.ethers.formatEther(rental.totalFeesEarned)} ETH`);
        console.log(`  Net Profit: ${hre.ethers.formatEther(profits.netProfit)} ETH`);
        console.log(`  ROI: ${Number(profits.roi) / 100}%`);
        console.log();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
