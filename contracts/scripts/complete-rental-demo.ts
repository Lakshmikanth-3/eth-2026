import { ethers } from "hardhat";

async function main() {
    console.log("🎯 COMPLETE DEMO: Rent Pool + Execute Swaps + See Profits\n");
    console.log("This script will:\n");
    console.log("1. Rent Pool #2 (USDT/WETH)");
    console.log("2. Mint test tokens (USDT & WETH)");
    console.log("3. Execute 5 swaps");
    console.log("4. Show profit breakdown\n");
    console.log("═══════════════════════════════════════════\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Wallet Address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Current Balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.1")) {
        console.log("\n⚠️  WARNING: Low balance! You might need testnet ETH.");
        console.log("   Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia\n");
    } else {
        console.log("✅ Sufficient balance\n");
    }

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    const flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055";
    const poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");

    console.log(`🌐 Network: Arbitrum Sepolia (Chain ID: ${chainId})`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // STEP 1: RENT POOL #2
    console.log("═══════════════════════════════════════════");
    console.log("STEP 1: Renting Pool #2 (USDT/WETH)");
    console.log("═══════════════════════════════════════════\n");

    const poolId = 2n;
    const duration = 7200; // 2 hours
    const pricePerSecond = ethers.parseEther("0.00001"); // 0.00001 ETH/sec
    const rentalCost = BigInt(duration) * pricePerSecond;
    const collateral = (rentalCost * 120n) / 100n;
    const totalValue = rentalCost + collateral;

    console.log(`Pool ID: ${poolId}`);
    console.log(`Duration: ${duration / 3600} hours`);
    console.log(`Price: ${ethers.formatEther(pricePerSecond)} ETH/second`);
    console.log(`Rental Cost: ${ethers.formatEther(rentalCost)} ETH`);
    console.log(`Collateral (120%): ${ethers.formatEther(collateral)} ETH`);
    console.log(`Total Required: ${ethers.formatEther(totalValue)} ETH\n`);

    console.log("Creating rental...");

    let rentalId: bigint;
    try {
        const rentTx = await flashLP.rentPool(poolId, duration, pricePerSecond, {
            value: totalValue,
            gasLimit: 500000
        });

        console.log("Transaction sent! Hash:", rentTx.hash);
        console.log("Waiting for confirmation...\n");

        const receipt = await rentTx.wait();
        console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);

        // Find rental ID from event
        const rentalEvent = receipt.logs.find((log) => {
            try {
                const parsed = flashLP.interface.parseLog(log);
                return parsed?.name === 'RentalCreated';
            } catch {
                return false;
            }
        });

        if (!rentalEvent) {
            throw new Error("RentalCreated event not found");
        }

        const parsed = flashLP.interface.parseLog(rentalEvent);
        rentalId = parsed?.args.rentalId;
        console.log(`🎫 Rental ID: ${rentalId}\n`);

    } catch (error: any) {
        console.error("❌ Rental failed:", error.message);
        return;
    }

    // STEP 2: MINT TOKENS
    console.log("═══════════════════════════════════════════");
    console.log("STEP 2: Minting Test Tokens");
    console.log("═══════════════════════════════════════════\n");

    const usdt = MockERC20.attach(poolsConfig.tokens.USDT);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    console.log("Minting 10,000 USDT...");
    await (await usdt.mint(deployer.address, ethers.parseUnits("10000", 6))).wait();
    console.log("✅ Minted");

    console.log("Minting 5 WETH...");
    await (await weth.mint(deployer.address, ethers.parseEther("5"))).wait();
    console.log("✅ Minted\n");

    console.log("Approving FlashLP to spend tokens...");
    await (await usdt.approve(flashLPAddress, ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Approvals complete\n");

    // STEP 3: EXECUTE SWAPS
    console.log("═══════════════════════════════════════════");
    console.log("STEP 3: Executing 5 Swaps");
    console.log("═══════════════════════════════════════════\n");

    let totalFeesGenerated = 0n;
    const swapResults = [];

    for (let i = 1; i <= 5; i++) {
        console.log(`Swap #${i}:`);

        try {
            if (i % 2 === 1) {
                // Swap USDT -> WETH
                const amountIn = ethers.parseUnits("200", 6); // 200 USDT
                console.log(`  Swapping 200 USDT → WETH...`);

                const tx = await flashLP.executeSwap(
                    rentalId,
                    poolsConfig.tokens.USDT,
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
                    const amountOut = parsed?.args.amountOut;
                    totalFeesGenerated += fee;

                    console.log(`  ✅ Got ${ethers.formatEther(amountOut).substring(0, 8)} WETH`);
                    console.log(`  💰 Fee earned: ${ethers.formatEther(fee)} ETH`);
                    swapResults.push({ swap: i, fee: ethers.formatEther(fee) });
                }
            } else {
                // Swap WETH -> USDT
                const amountIn = ethers.parseEther("0.08"); // 0.08 WETH
                console.log(`  Swapping 0.08 WETH → USDT...`);

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
                    const amountOut = parsed?.args.amountOut;
                    totalFeesGenerated += fee;

                    console.log(`  ✅ Got ${ethers.formatUnits(amountOut, 6)} USDT`);
                    console.log(`  💰 Fee earned: ${ethers.formatEther(fee)} ETH`);
                    swapResults.push({ swap: i, fee: ethers.formatEther(fee) });
                }
            }
        } catch (error: any) {
            console.log(`  ❌ Failed:`, error.message);
        }

        console.log();
    }

    // STEP 4: SHOW RESULTS
    console.log("═══════════════════════════════════════════");
    console.log("STEP 4: Profit Analysis");
    console.log("═══════════════════════════════════════════\n");

    const rental = await flashLP.getRental(rentalId);
    const profits = await flashLP.getRentalProfits(rentalId);

    console.log(`📊 Rental #${rentalId} Stats:`);
    console.log(`  Pool ID: ${rental.poolId}`);
    console.log(`  Total Swaps: ${rental.swapCount}`);
    console.log(`  Total Volume: ${ethers.formatEther(rental.totalVolume)} ETH`);
    console.log(`  Total Fees Collected: ${ethers.formatEther(totalFeesGenerated)} ETH\n`);

    console.log(`💰 Profit Breakdown:`);
    console.log(`  ┌─────────────────────────────────────────┐`);
    console.log(`  │ Fees Earned:      +${ethers.formatEther(profits.totalFeesEarned).padEnd(18)} ETH │`);
    console.log(`  │ Rental Cost:      -${ethers.formatEther(profits.rentalCostPaid).padEnd(18)} ETH │`);
    console.log(`  │ Est. Gas Cost:    -${ethers.formatEther(profits.gasCostEstimate).padEnd(18)} ETH │`);
    console.log(`  ├─────────────────────────────────────────┤`);
    console.log(`  │ Gross Profit:      ${ethers.formatEther(profits.grossProfit).padEnd(18)} ETH │`);
    console.log(`  │ Net Profit:        ${ethers.formatEther(profits.netProfit).padEnd(18)} ETH │`);
    console.log(`  │ ROI:               ${(Number(profits.roi) / 100).toFixed(2).padEnd(18)} %   │`);
    console.log(`  └─────────────────────────────────────────┘\n`);

    console.log("🎉 DEMO COMPLETE!\n");
    console.log("═══════════════════════════════════════════");
    console.log("Next Steps:");
    console.log("═══════════════════════════════════════════\n");
    console.log(`1. Visit: http://localhost:3000/analytics`);
    console.log(`2. Connect with wallet: ${deployer.address}`);
    console.log(`3. You should see Rental #${rentalId} with:`);
    console.log(`   - ${rental.swapCount} swaps`);
    console.log(`   - ${ethers.formatEther(profits.netProfit)} ETH profit`);
    console.log(`   - ${(Number(profits.roi) / 100).toFixed(2)}% ROI`);
    console.log(`   - Complete swap history\n`);

    console.log("✨ Your profits are now visible on-chain!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
