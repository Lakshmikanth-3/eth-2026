const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying UnifiedFlashLPV4...\n");

    const YELLOW_CHANNEL_MANAGER = "0xd546ed7c2e35f52187ab9160ebd1bf0713893be4";
    const V4_ROUTER = "0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    console.log("📦 Deploying contract...");
    const UnifiedFlashLPV4 = await hre.ethers.getContractFactory("UnifiedFlashLPV4");
    const flashLP = await UnifiedFlashLPV4.deploy(YELLOW_CHANNEL_MANAGER, V4_ROUTER);

    await flashLP.waitForDeployment();
    const address = await flashLP.getAddress();

    console.log("\n✅ UnifiedFlashLPV4 deployed to:", address);
    console.log("\n🔍 Verify with:");
    console.log(`npx hardhat verify --network baseSepolia ${address} "${YELLOW_CHANNEL_MANAGER}" "${V4_ROUTER}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
