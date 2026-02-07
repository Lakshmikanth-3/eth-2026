
import hre from "hardhat";
import * as fs from "fs";

async function main() {
    console.log("🚀 Starting UnifiedFlashLP ONLY deployment...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy UnifiedFlashLP
    console.log("📦 Deploying UnifiedFlashLP...");
    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const unified = await UnifiedFlashLP.deploy();
    await unified.waitForDeployment();
    const unifiedAddress = await unified.getAddress();
    console.log("✅ UnifiedFlashLP deployed to:", unifiedAddress, "\n");

    const result = {
        address: unifiedAddress,
        network: (await hre.ethers.provider.getNetwork()).name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId)
    };

    fs.writeFileSync("deployed_unified.json", JSON.stringify(result, null, 2));
    console.log("💾 Saved to deployed_unified.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
