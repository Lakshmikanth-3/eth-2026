import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking All Rentals On-Chain\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Account:", deployer.address);

    // Get network
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    const flashLPAddress = chainId === 421614
        ? "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055"
        : "0x72517E5D43abeF096BEB3A7a931E416A91b2A0c5";

    console.log(`🌐 Chain ID: ${chainId}`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    // Get all rentals for this account
    console.log("Fetching all rentals...\n");
    const rentalIds = await flashLP.getRenterRentals(deployer.address);

    console.log(`Found ${rentalIds.length} rental(s):\n`);

    for (const rentalId of rentalIds) {
        console.log(`═══════════════════════════════════`);
        console.log(`Rental ID: ${rentalId}`);
        console.log(`═══════════════════════════════════`);

        const rental = await flashLP.getRental(rentalId);
        console.log(`Pool ID: ${rental.poolId}`);
        console.log(`Renter: ${rental.renter}`);
        console.log(`Active: ${rental.isActive}`);
        console.log(`Swap Count: ${rental.swapCount}`);
        console.log(`Total Volume: ${ethers.formatEther(rental.totalVolume)} ETH`);
        console.log(`Total Fees: ${ethers.formatEther(rental.totalFeesEarned)} ETH`);

        if (rental.swapCount > 0n) {
            console.log(`\n📊 This rental has swaps! Getting details...`);
            const swaps = await flashLP.getSwapHistory(rentalId);
            console.log(`Swap history length: ${swaps.length}`);
        }

        console.log();
    }

    console.log("\n✅ Check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
