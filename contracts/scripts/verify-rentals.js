const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);

    console.log("Hardhat Wallet Address:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

    // Check for rentals
    const flashLP = await hre.ethers.getContractAt(
        "FlashLP",
        "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055"
    );

    const rentals = await flashLP.getRenterRentals(deployer.address);
    console.log("\nRentals for this wallet:", rentals.length);

    for (let i = 0; i < rentals.length; i++) {
        const rental = await flashLP.getRental(rentals[i]);
        console.log(`\nRental #${rentals[i]}:`);
        console.log(`  Swaps: ${rental.swapCount}`);
        console.log(`  Active: ${rental.isActive}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
