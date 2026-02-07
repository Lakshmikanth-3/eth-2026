import hre from "hardhat";

async function main() {
    console.log("🚀 Starting Flash LP deployment...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // 1. Deploy YellowChannelManager
    console.log("📦 Deploying YellowChannelManager...");
    const YellowChannelManager = await hre.ethers.getContractFactory("YellowChannelManager");
    const yellowManager = await YellowChannelManager.deploy();
    await yellowManager.waitForDeployment();
    const yellowManagerAddress = await yellowManager.getAddress();
    console.log("✅ YellowChannelManager deployed to:", yellowManagerAddress, "\n");

    // 2. Deploy RentalVault
    console.log("📦 Deploying RentalVault...");
    const RentalVault = await hre.ethers.getContractFactory("RentalVault");
    const vault = await RentalVault.deploy();
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("✅ RentalVault deployed to:", vaultAddress, "\n");

    // 3. Deploy RentalManager
    console.log("📦 Deploying RentalManager...");
    const RentalManager = await hre.ethers.getContractFactory("RentalManager");
    const manager = await RentalManager.deploy(yellowManagerAddress, vaultAddress);
    await manager.waitForDeployment();
    const managerAddress = await manager.getAddress();
    console.log("✅ RentalManager deployed to:", managerAddress, "\n");

    // 4. Transfer vault ownership to manager
    console.log("🔗 Transferring RentalVault ownership to RentalManager...");
    const tx = await vault.transferOwnership(managerAddress);
    await tx.wait();
    console.log("✅ Ownership transferred!\n");

    // 5. Deploy UnifiedFlashLP (Upgrade)
    console.log("📦 Deploying UnifiedFlashLP...");
    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const unified = await UnifiedFlashLP.deploy();
    await unified.waitForDeployment();
    const unifiedAddress = await unified.getAddress();
    console.log("✅ UnifiedFlashLP deployed to:", unifiedAddress, "\n");

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("Network:", (await hre.ethers.provider.getNetwork()).name);
    console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
    console.log("\n📝 Contract Addresses:");
    console.log("YellowChannelManager:", yellowManagerAddress);
    console.log("RentalVault:", vaultAddress);
    console.log("RentalManager:", managerAddress);
    console.log("\n💡 Save these addresses for frontend integration!");
    console.log("=".repeat(60));

    // Export addresses
    const deployment = {
        network: (await hre.ethers.provider.getNetwork()).name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            YellowChannelManager: yellowManagerAddress,
            RentalVault: vaultAddress,
            RentalManager: managerAddress,
            UnifiedFlashLP: unifiedAddress,
        },
    };

    console.log("\n📝 Contract Addresses:");
    console.log("YellowChannelManager:", yellowManagerAddress);
    console.log("RentalVault:", vaultAddress);
    console.log("RentalManager:", managerAddress);
    console.log("UnifiedFlashLP (New):", unifiedAddress);

    console.log("\n📄 Deployment JSON:");
    console.log(JSON.stringify(deployment, null, 2));

    // Write to file for reliability
    const fs = require("fs");
    fs.writeFileSync("deployed_addresses.json", JSON.stringify(deployment, null, 2));
    console.log("\n💾 Saved to deployed_addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error("Reason:", error.reason || error.message);
        console.error("Full Error:", error);
        process.exit(1);
    });