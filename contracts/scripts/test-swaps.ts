import { ethers } from "hardhat";

async function main() {
    console.log("💱 Executing Test Swaps Through Rental\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);

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

    console.log(`🌐 Network: Chain ID ${chainId}`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    // Get contracts
    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(poolsConfig.tokens.USDC);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    // Get rental ID from user (default to 1)
    const rentalId = process.env.RENTAL_ID || "1";
    console.log(`🎫 Using Rental ID: ${rentalId}\n`);

    // Check rental exists
    const rental = await flashLP.getRental(rentalId);
    if (!rental.isActive) {
        console.log("❌ Rental is not active!");
        console.log("Please rent a pool first from the frontend.");
        return;
    }

    console.log("✅ Rental is active");
    console.log(`   Pool ID: ${rental.poolId}`);
    console.log(`   Renter: ${rental.renter}`);
    console.log(`   Current Swaps: ${rental.swapCount}\n`);

    // Mint tokens to deployer for swapping
    console.log("🪙 Minting tokens for swaps...");
    await (await usdc.mint(deployer.address, ethers.parseUnits("10000", 6))).wait();
    console.log("✅ Minted 10,000 USDC");

    await (await weth.mint(deployer.address, ethers.parseEther("5"))).wait();
    console.log("✅ Minted 5 WETH\n");

    // Approve FlashLP
    console.log("🔓 Approving FlashLP...");
    await (await usdc.approve(flashLPAddress, ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Approvals complete\n");

    // Execute multiple swaps
    const numSwaps = 5;
    console.log(`═══════════════════════════════════`);
    console.log(`Executing ${numSwaps} Test Swaps`);
    console.log(`═══════════════════════════════════\n`);

    for (let i = 1; i <= numSwaps; i++) {
        console.log(`Swap #${i}:`);

        // Alternate between USDC -> WETH and WETH -> USDC
        if (i % 2 === 1) {
            // Swap USDC for WETH
            const amountIn = ethers.parseUnits("100", 6); // 100 USDC
            const minOut = ethers.parseEther("0.01"); // Min 0.01 WETH

            console.log(`  Swapping 100 USDC for WETH...`);
            const tx = await flashLP.executeSwap(
                rentalId,
                poolsConfig.tokens.USDC,
                amountIn,
                minOut,
                { gasLimit: 500000 }
            );
            const receipt = await tx.wait();

            // Find SwapExecuted event
            const swapEvent = receipt.logs.find((log: any) => {
                try {
                    const parsed = flashLP.interface.parseLog(log);
                    return parsed?.name === 'SwapExecuted';
                } catch {
                    return false;
                }
            });

            if (swapEvent) {
                const parsed = flashLP.interface.parseLog(swapEvent);
                console.log(`  ✅ Swapped! Got ${ethers.formatEther(parsed?.args.amountOut)} WETH`);
                console.log(`  💰 Fee generated: ${ethers.formatEther(parsed?.args.feeCharged)} ETH`);
            }
        } else {
            // Swap WETH for USDC
            const amountIn = ethers.parseEther("0.05"); // 0.05 WETH
            const minOut = ethers.parseUnits("50", 6); // Min 50 USDC

            console.log(`  Swapping 0.05 WETH for USDC...`);
            const tx = await flashLP.executeSwap(
                rentalId,
                poolsConfig.tokens.WETH,
                amountIn,
                minOut,
                { gasLimit: 500000 }
            );
            const receipt = await tx.wait();

            // Find SwapExecuted event
            const swapEvent = receipt.logs.find((log: any) => {
                try {
                    const parsed = flashLP.interface.parseLog(log);
                    return parsed?.name === 'SwapExecuted';
                } catch {
                    return false;
                }
            });

            if (swapEvent) {
                const parsed = flashLP.interface.parseLog(swapEvent);
                console.log(`  ✅ Swapped! Got ${ethers.formatUnits(parsed?.args.amountOut, 6)} USDC`);
                console.log(`  💰 Fee generated: ${ethers.formatEther(parsed?.args.feeCharged)} ETH`);
            }
        }

        console.log();
    }

    // Get updated rental info
    console.log(`═══════════════════════════════════`);
    console.log("📊 Updated Rental Stats");
    console.log(`═══════════════════════════════════\n`);

    const updatedRental = await flashLP.getRental(rentalId);
    console.log(`Total Swaps: ${updatedRental.swapCount}`);
    console.log(`Total Volume: ${ethers.formatEther(updatedRental.totalVolume)} ETH`);
    console.log(`Total Fees Earned: ${ethers.formatEther(updatedRental.totalFeesEarned)} ETH\n`);

    // Get profit breakdown
    const profits = await flashLP.getRentalProfits(rentalId);
    console.log("💰 Profit Analysis:");
    console.log(`   Fees Earned: +${ethers.formatEther(profits.totalFeesEarned)} ETH`);
    console.log(`   Rental Cost: -${ethers.formatEther(profits.rentalCostPaid)} ETH`);
    console.log(`   Est. Gas: -${ethers.formatEther(profits.gasCostEstimate)} ETH`);
    console.log(`   ─────────────────────────────`);
    console.log(`   Net Profit: ${ethers.formatEther(profits.netProfit)} ETH`);
    console.log(`   ROI: ${Number(profits.roi) / 100}%\n`);

    console.log("🎉 Swaps Complete!");
    console.log("✅ Refresh your analytics page to see updated profits!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
