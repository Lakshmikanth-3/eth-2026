
const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Checking balance for:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.error("❌ ERROR: Balance is 0. You need Arbitrum Sepolia ETH.");
    } else {
        console.log("✅ Balance is sufficient for deployment check.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
