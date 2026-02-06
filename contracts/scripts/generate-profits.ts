import { ethers } from "hardhat";

async function main() {
    console.log("💱 Execute Swaps to Generate Profits\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Account:", deployer.address);

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let flashLPAddress, poolsConfig;

    if (chainId === 421614) {
        flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055";
        poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");
    } else if (chainId === 84532) {
        flashLPAddress = "0x72517E5D43abeF096BEB3A7a931E416A91b2A0c5";
        poolsConfig = require("../../deployments/baseSepolia_pools.json");
    } else {
        throw new Error("Unsupported network");
    }

    console.log(`🌐 Chain ID: ${chainId}`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    // Get rental ID from environment or use default
    const rentalId = process.env.RENTAL_ID || "1";
    console.log(`🎫 Using Rental ID: #${rentalId}\n`);

    // Get contracts
    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    // Check rental
    console.log("Checking rental status...");
    const rental = await flashLP.getRental(rentalId);

    if (!rental.isActive) {
        console.log("❌ Rental is not active!");
        console.log("Please use an active rental ID.");
        return;
    }

    if (rental.renter.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ You are not the renter of this rental!");
        console.log(`Renter: ${rental.renter}`);
        console.log(`Your address: ${deployer.address}`);
        return;
    }

    console.log("✅ Rental is active and you are the renter");
    console.log(`   Pool ID: ${rental.poolId}`);
    console.log(`   Current Swaps: ${rental.swapCount}\n`);

    // Get token contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(poolsConfig.tokens.USDC);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    // Mint tokens
    console.log("═══════════════════════════════════");
    console.log("Preparing Tokens");
    console.log("═══════════════════════════════════\n");

    console.log("Minting tokens...");
    await (await usdc.mint(deployer.address, ethers.parseUnits("5000", 6))).wait();
    console.log("✅ Minted 5,000 USDC");

    await (await weth.mint(deployer.address, ethers.parseEther("2"))).wait();
    console.log("✅ Minted 2 WETH\n");

    console.log("Approving FlashLP...");
    await (await usdc.approve(flashLPAddress, ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Tokens approved\n");

    // Execute swaps
    console.log("═══════════════════════════════════");
    console.log("Executing Swaps");
    console.log("═══════════════════════════════════\n");

    const numSwaps = 5;
    let totalFees = 0n;

    for (let i = 1; i <= numSwaps; i++) {
        console.log(`Swap #${i}:`);

        try {
            if (i % 2 === 1) {
                // Swap USDC -> WETH
                const amountIn = ethers.parseUnits("100", 6);
                console.log(`  Swapping 100 USDC -> WETH...`);

                const tx = await flashLP.executeSwap(
                    rentalId,
                    poolsConfig.tokens.USDC,
                    amountIn,
                    0n,
                    { gasLimit: 500000 }
                );
                const receipt = await tx.wait();

                const swapEvent = receipt.logs.find((log) => {
                    try {
                        const parsed = flashLP.interface.parseLog(log);
                        return parsed?.name === 'SwapExecuted';
                    } catch {
                        return false;
                    }
                });

                if (swapEvent) {
                    const parsed = flashLP.interface.parseLog(swapEvent);
                    const fee = parsed?.args.feeCharged;
                    totalFees += fee;
                    console.log(`  ✅ Fee earned: ${ethers.formatEther(fee)} ETH`);
                }
            } else {
                // Swap WETH -> USDC
                const amountIn = ethers.parseEther("0.04");
                console.log(`  Swapping 0.04 WETH -> USDC...`);

                const tx = await flashLP.executeSwap(
                    rentalId,
                    poolsConfig.tokens.WETH,
                    amountIn,
                    0n,
                    { gasLimit: 500000 }
                );
                const receipt = await tx.wait();

                const swapEvent = receipt.logs.find((log) => {
                    try {
                        const parsed = flashLP.interface.parseLog(log);
                        return parsed?.name === 'SwapExecuted';
                    } catch {
                        return false;
                    }
                });

                if (swapEvent) {
                    const parsed = flashLP.interface.parseLog(swapEvent);
                    const fee = parsed?.args.feeCharged;
                    totalFees += fee;
                    console.log(`  ✅ Fee earned: ${ethers.formatEther(fee)} ETH`);
                }
            }
        } catch (error) {
            console.log(`  ❌ Swap failed:`, error.message);
        }

        console.log();
    }

    // Show results
    console.log("═══════════════════════════════════");
    console.log("📊 Profit Analytics");
    console.log("═══════════════════════════════════\n");

    const updatedRental = await flashLP.getRental(rentalId);
    const profits = await flashLP.getRentalProfits(rentalId);

    console.log(`Rental #${rentalId}:`);
    console.log(`  Swaps: ${updatedRental.swapCount}`);
    console.log(`  Volume: ${ethers.formatEther(updatedRental.totalVolume)} ETH`);
    console.log(`  Total Fees: ${ethers.formatEther(totalFees)} ETH\n`);

    console.log(`💰 Profit Breakdown:`);
    console.log(`  Fees Earned:   +${ethers.formatEther(profits.totalFeesEarned)} ETH`);
    console.log(`  Rental Cost:   -${ethers.formatEther(profits.rentalCostPaid)} ETH`);
    console.log(`  Est. Gas:      -${ethers.formatEther(profits.gasCostEstimate)} ETH`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Net Profit:     ${ethers.formatEther(profits.netProfit)} ETH`);
    console.log(`  ROI:            ${Number(profits.roi) / 100}%\n`);

    console.log("🎉 Swaps Complete!");
    console.log("\n✅ Refresh http://localhost:3000/analytics to see updated profits!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
