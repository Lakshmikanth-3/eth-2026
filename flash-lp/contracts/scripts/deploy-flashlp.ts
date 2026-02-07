import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Deploying FlashLP Contract...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let networkName = "unknown";
    if (chainId === 421614) networkName = "arbitrumSepolia";
    else if (chainId === 84532) networkName = "baseSepolia";
    else if (chainId === 11155420) networkName = "optimismSepolia";

    console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})\n`);

    // Deploy FlashLP
    console.log("📦 Deploying FlashLP contract...");
    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = await FlashLP.deploy();
    await flashLP.waitForDeployment();

    const flashLPAddress = await flashLP.getAddress();
    console.log("✅ FlashLP deployed to:", flashLPAddress);

    // Save deployment info
    const deploymentInfo = {
        network: networkName,
        chainId: chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            FlashLP: flashLPAddress
        }
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save to file
    const filename = path.join(deploymentsDir, `${networkName}_flashlp.json`);
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filename}`);

    console.log("\n✅ Deployment Complete!\n");
    console.log("📋 Next Steps:");
    console.log("1. Verify contract on block explorer");
    console.log("2. Update src/lib/contracts.ts with new address");
    console.log("3. Extract ABI: npx hardhat run contracts/scripts/extract-abis.js");
    console.log("4. Test on frontend\n");

    console.log("🔗 Block Explorer:");
    if (chainId === 421614) {
        console.log(`https://sepolia.arbiscan.io/address/${flashLPAddress}`);
    } else if (chainId === 84532) {
        console.log(`https://sepolia.basescan.org/address/${flashLPAddress}`);
    } else if (chainId === 11155420) {
        console.log(`https://sepolia-optimism.etherscan.io/address/${flashLPAddress}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
