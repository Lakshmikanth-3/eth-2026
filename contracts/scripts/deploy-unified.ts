import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying UnifiedFlashLP...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy UnifiedFlashLP
    console.log("📦 Deploying UnifiedFlashLP...");
    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const flashLP = await UnifiedFlashLP.deploy();
    await flashLP.waitForDeployment();
    const flashLPAddress = await flashLP.getAddress();
    console.log("✅ UnifiedFlashLP deployed to:", flashLPAddress, "\n");

    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let chainName = "unknown";
    if (chainId === 421614) chainName = "arbitrumSepolia";
    if (chainId === 84532) chainName = "baseSepolia";
    if (chainId === 11155420) chainName = "optimismSepolia";

    // Save deployment info
    const deploymentInfo = {
        network: chainName,
        chainId: chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            UnifiedFlashLP: flashLPAddress
        }
    };

    console.log("📊 Deployment Summary:");
    console.log("========================");
    console.log("Network:", chainName, `(${chainId})`);
    console.log("Deployer:", deployer.address);
    console.log("\n📝 Contract Addresses:");
    console.log("------------------------");
    console.log("UnifiedFlashLP:", flashLPAddress);
    console.log("\n💾 Saving deployment info...");

    // Save to JSON file
    const deploymentsDir = path.join(__dirname, "..", "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, `${chainName}_unified.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Deployment info saved to:", deploymentPath);

    console.log("\n🎯 Next Steps:");
    console.log("1. Update src/lib/contracts.ts with new address");
    console.log("2. Extract ABI: npx hardhat run scripts/extract-abis.js");
    console.log("3. Test the contract on the frontend");

    console.log("\n📋 Copy this for contracts.ts:");
    console.log(`    ${chainId}: {`);
    console.log(`        UnifiedFlashLP: "${flashLPAddress}"`);
    console.log(`    }`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
