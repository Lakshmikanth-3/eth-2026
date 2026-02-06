import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Complete Pool Setup Script\n");
    console.log("This will:");
    console.log("1. Deploy Mock ERC20 tokens");
    console.log("2. Create liquidity pools in FlashLP");
    console.log("3. Saveaddresses for frontend\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let flashLPAddress;
    let networkName;

    if (chainId === 421614) {
        flashLPAddress = "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567";
        networkName = "arbitrumSepolia";
    } else if (chainId === 84532) {
        flashLPAddress = "0x8BC377c95BcF6B14c270dbA2597c3034adeb4815";
        networkName = "baseSepolia";
    } else {
        throw new Error("Unsupported network");
    }

    console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    // Step 1: Deploy Mock Tokens
    console.log("═══════════════════════════════════");
    console.log("Step 1: Deploying Mock ERC20 Tokens");
    console.log("═══════════════════════════════════\n");

    const MockERC20 = await ethers.getContractFactory("MockERC20");

    console.log("Deploying USDC...");
    const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("✅ USDC:", usdcAddress);

    console.log("Deploying WETH...");
    const weth = await MockERC20.deploy("Mock Wrapped ETH", "WETH", 18);
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log("✅ WETH:", wethAddress);

    console.log("Deploying USDT...");
    const usdt = await MockERC20.deploy("Mock USDT", "USDT", 6);
    await usdt.waitForDeployment();
    const usdtAddress = await usdt.getAddress();
    console.log("✅ USDT:", usdtAddress);

    console.log("Deploying DAI...");
    const dai = await MockERC20.deploy("Mock DAI", "DAI", 18);
    await dai.waitForDeployment();
    const daiAddress = await dai.getAddress();
    console.log("✅ DAI:", daiAddress);

    // Step 2: Approve FlashLP
    console.log("\n═══════════════════════════════════");
    console.log("Step 2: Approving FlashLP Contract");
    console.log("═══════════════════════════════════\n");

    console.log("Approving USDC...");
    await (await usdc.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ USDC approved");

    console.log("Approving WETH...");
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ WETH approved");

    console.log("Approving USDT...");
    await (await usdt.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ USDT approved");

    console.log("Approving DAI...");
    await (await dai.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ DAI approved");

    // Step 3: Create Pools
    console.log("\n═══════════════════════════════════");
    console.log("Step 3: Creating Liquidity Pools");
    console.log("═══════════════════════════════════\n");

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    console.log("Creating Pool 1: USDC/WETH (1000 USDC / 0.5 WETH)...");
    const tx1 = await flashLP.createPool(
        usdcAddress,
        wethAddress,
        ethers.parseUnits("1000", 6),  // 1000 USDC
        ethers.parseEther("0.5"),       // 0.5 WETH
        { gasLimit: 500000 }
    );
    await tx1.wait();
    console.log("✅ Pool #1 created");

    console.log("Creating Pool 2: USDT/WETH (2000 USDT / 1.0 WETH)...");
    const tx2 = await flashLP.createPool(
        usdtAddress,
        wethAddress,
        ethers.parseUnits("2000", 6),  // 2000 USDT
        ethers.parseEther("1.0"),       // 1.0 WETH
        { gasLimit: 500000 }
    );
    await tx2.wait();
    console.log("✅ Pool #2 created");

    console.log("Creating Pool 3: DAI/USDC (1500 DAI / 1500 USDC)...");
    const tx3 = await flashLP.createPool(
        daiAddress,
        usdcAddress,
        ethers.parseEther("1500"),     // 1500 DAI
        ethers.parseUnits("1500", 6),  // 1500 USDC
        { gasLimit: 500000 }
    );
    await tx3.wait();
    console.log("✅ Pool #3 created");

    // Step 4: Save Configuration
    console.log("\n═══════════════════════════════════");
    console.log("Step 4: Saving Configuration");
    console.log("═══════════════════════════════════\n");

    const config = {
        network: networkName,
        chainId: chainId,
        flashLP: flashLPAddress,
        tokens: {
            USDC: usdcAddress,
            WETH: wethAddress,
            USDT: usdtAddress,
            DAI: daiAddress
        },
        pools: [
            { id: 1, pair: "USDC/WETH", token0: usdcAddress, token1: wethAddress, amount0: "1000", amount1: "0.5" },
            { id: 2, pair: "USDT/WETH", token0: usdtAddress, token1: wethAddress, amount0: "2000", amount1: "1.0" },
            { id: 3, pair: "DAI/USDC", token0: daiAddress, token1: usdcAddress, amount0: "1500", amount1: "1500" }
        ],
        timestamp: new Date().toISOString()
    };

    const configDir = path.join(__dirname, "..", "..", "deployments");
    const configFile = path.join(configDir, `${networkName}_pools.json`);

    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    console.log(`💾 Configuration saved to: ${configFile}`);

    console.log("\n🎉 Complete Setup Finished!\n");
    console.log("═══════════════════════════════════");
    console.log("📊 Summary");
    console.log("═══════════════════════════════════");
    console.log(`Network: ${networkName}`);
    console.log(`FlashLP: ${flashLPAddress}`);
    console.log("\nTokens:");
    console.log(`  USDC: ${usdcAddress}`);
    console.log(`  WETH: ${wethAddress}`);
    console.log(`  USDT: ${usdtAddress}`);
    console.log(`  DAI: ${daiAddress}`);
    console.log("\nPools:");
    console.log("  #1: USDC/WETH (1000 / 0.5)");
    console.log("  #2: USDT/WETH (2000 / 1.0)");
    console.log("  #3: DAI/USDC (1500 / 1500)");
    console.log("\n✅ You can now rent pools #1, #2, or #3 on the frontend!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
