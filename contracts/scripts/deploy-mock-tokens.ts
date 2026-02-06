import { ethers } from "hardhat";

async function main() {
    console.log("🪙 Deploying Mock ERC20 Tokens...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);

    // Simple Mock ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // Deploy USDC (6 decimals)
    console.log("Deploying Mock USDC...");
    const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("✅ Mock USDC:", usdcAddress);

    // Deploy WETH (18 decimals)
    console.log("Deploying Mock WETH...");
    const weth = await MockERC20.deploy("Mock Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log("✅ Mock WETH:", wethAddress);

    // Deploy USDT (6 decimals)
    console.log("Deploying Mock USDT...");
    const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log("✅ Mock USDT:", usdtAddress);

    // Deploy DAI (18 decimals)
    console.log("Deploying Mock DAI...");
    const dai = await MockERC20.deploy("Mock DAI", "DAI", 18);
    await dai.waitForDeployment();
    const daiAddress = await dai.getAddress();
    console.log("✅ Mock DAI:", daiAddress);

    console.log("\n🎉 All tokens deployed!\n");
    console.log("📋 Token Addresses:");
    console.log(`   USDC: ${usdcAddress}`);
    console.log(`   WETH: ${wethAddress}`);
    console.log(`   USDT: ${usdtAddress}`);
    console.log(`   DAI: ${daiAddress}`);

    console.log("\n✅ Now run: npx hardhat run contracts/scripts/create-pools.ts --network <network>");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
