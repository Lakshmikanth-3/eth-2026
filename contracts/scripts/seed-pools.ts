import { ethers } from "hardhat";

async function main() {
    console.log("🌱 Seeding FlashLP with test pools...\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let flashLPAddress;
    if (chainId === 421614) {
        flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055"; // Arbitrum Sepolia
    } else if (chainId === 84532) {
        flashLPAddress = "0x72517E5D43abeF096BEB3A7a931E416A91b2A0c5"; // Base Sepolia
    } else {
        throw new Error("Unsupported network");
    }

    console.log(`🌐 Network: Chain ID ${chainId}`);
    console.log(`📦 FlashLP Address: ${flashLPAddress}\n`);

    // Get FlashLP contract
    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    // Mock token addresses (using random addresses for demo)
    // In production, you'd use actual ERC20 token contracts
    const MOCK_USDC = "0x0000000000000000000000000000000000000001";
    const MOCK_WETH = "0x0000000000000000000000000000000000000002";
    const MOCK_USDT = "0x0000000000000000000000000000000000000003";
    const MOCK_DAI = "0x0000000000000000000000000000000000000004";

    console.log("📋 Creating test pools...\n");

    // For testing, we'll create pools with ETH value since we can't use real ERC20s
    // In production, you'd approve and transfer actual tokens

    try {
        // Pool 1: USDC/WETH
        console.log("Creating Pool 1: USDC/WETH...");
        const tx1 = await flashLP.createPool(
            MOCK_USDC,
            MOCK_WETH,
            ethers.parseUnits("1000", 6), // 1000 USDC
            ethers.parseEther("0.5"),     // 0.5 ETH
            { gasLimit: 500000 }
        );
        await tx1.wait();
        console.log("✅ Pool 1 created\n");

        // Pool 2: USDT/WETH
        console.log("Creating Pool 2: USDT/WETH...");
        const tx2 = await flashLP.createPool(
            MOCK_USDT,
            MOCK_WETH,
            ethers.parseUnits("2000", 6), // 2000 USDT
            ethers.parseEther("1.0"),     // 1.0 ETH
            { gasLimit: 500000 }
        );
        await tx2.wait();
        console.log("✅ Pool 2 created\n");

        // Pool 3: DAI/USDC
        console.log("Creating Pool 3: DAI/USDC...");
        const tx3 = await flashLP.createPool(
            MOCK_DAI,
            MOCK_USDC,
            ethers.parseEther("1500"),    // 1500 DAI
            ethers.parseUnits("1500", 6), // 1500 USDC
            { gasLimit: 500000 }
        );
        await tx3.wait();
        console.log("✅ Pool 3 created\n");

    } catch (error: any) {
        console.error("❌ Error creating pools:", error.message);

        // If it failed because we need to transfer tokens first
        if (error.message.includes("ERC20")) {
            console.log("\n⚠️  Note: This script uses mock tokens.");
            console.log("For real testing, you need to:");
            console.log("1. Deploy actual ERC20 test tokens");
            console.log("2. Approve FlashLP to spend your tokens");
            console.log("3. Then call createPool\n");
        }

        process.exit(1);
    }

    console.log("🎉 Seeding complete!\n");
    console.log("📊 Pools created:");
    console.log("   Pool #1: USDC/WETH (1000 USDC / 0.5 ETH)");
    console.log("   Pool #2: USDT/WETH (2000 USDT / 1.0 ETH)");
    console.log("   Pool #3: DAI/USDC (1500 DAI / 1500 USDC)\n");

    console.log("✅ You can now rent these pools on the frontend!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
