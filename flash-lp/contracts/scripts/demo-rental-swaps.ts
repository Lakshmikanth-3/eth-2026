import { ethers } from "hardhat";

async function main() {
    console.log("🎯 Complete Rental + Swap Demo\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    let flashLPAddress, networkName, poolsConfig;

    if (chainId === 421614) {
        flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055";
        networkName = "arbitrumSepolia";
        poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");
    } else if (chainId === 84532) {
        flashLPAddress = "0x72517E5D43abeF096BEB3A7a931E416A91b2A0c5";
        networkName = "baseSepolia";
        poolsConfig = require("../../deployments/baseSepolia_pools.json");
    } else {
        throw new Error("Unsupported network");
    }

    console.log(`🌐 Network: ${networkName} (Chain ID: ${chainId})`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    // Get contracts
    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(poolsConfig.tokens.USDC);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    // Step 1: Rent a pool
    console.log("═══════════════════════════════════");
    console.log("Step 1: Renting Pool #1");
    console.log("═══════════════════════════════════\n");

    const poolId = 1n;
    const duration = 3600; // 1 hour
    const pricePerSecond = ethers.parseEther("0.00001"); // 0.00001 ETH/sec
    const rentalCost = BigInt(duration) * pricePerSecond;
    const collateral = (rentalCost * 120n) / 100n; // 120%

    console.log(`Pool ID: ${poolId}`);
    console.log(`Duration: ${duration / 3600} hour(s)`);
    console.log(`Rental Cost: ${ethers.formatEther(rentalCost)} ETH`);
    console.log(`Collateral: ${ethers.formatEther(collateral)} ETH`);
    console.log(`Total Required: ${ethers.formatEther(rentalCost + collateral)} ETH\n`);

    console.log("Creating rental...");
    const rentTx = await flashLP.rentPool(poolId, duration, pricePerSecond, {
        value: rentalCost + collateral,
        gasLimit: 500000
    });
    const rentReceipt = await rentTx.wait();

    // Find RentalCreated event
    const rentalEvent = rentReceipt.logs.find((log) => {
        try {
            const parsed = flashLP.interface.parseLog(log);
            return parsed?.name === 'RentalCreated';
        } catch {
            return false;
        }
    });

    let rentalId;
    if (rentalEvent) {
        const parsed = flashLP.interface.parseLog(rentalEvent);
        rentalId = parsed?.args.rentalId;
        console.log(`✅ Rental created! Rental ID: ${rentalId}\n`);
    } else {
        throw new Error("Rental creation failed");
    }

    // Step 2: Mint tokens for swapping
    console.log("═══════════════════════════════════");
    console.log("Step 2: Preparing Tokens for Swaps");
    console.log("═══════════════════════════════════\n");

    console.log("Minting test tokens...");
    await (await usdc.mint(deployer.address, ethers.parseUnits("10000", 6))).wait();
    console.log("✅ Minted 10,000 USDC");

    await (await weth.mint(deployer.address, ethers.parseEther("5"))).wait();
    console.log("✅ Minted 5 WETH\n");

    console.log("Approving FlashLP...");
    await (await usdc.approve(flashLPAddress, ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Approvals complete\n");

    // Step 3: Execute swaps
    console.log("═══════════════════════════════════");
    console.log("Step 3: Executing Test Swaps");
    console.log("═══════════════════════════════════\n");

    const numSwaps = 3;
    let totalFees = 0n;

    for (let i = 1; i <= numSwaps; i++) {
        console.log(`Swap #${i}:`);

        if (i % 2 === 1) {
            // Swap USDC for WETH
            const amountIn = ethers.parseUnits("100", 6);
            const minOut = 0n; // Accept any amount for testing

            console.log(`  Swapping 100 USDC...`);
            const tx = await flashLP.executeSwap(
                rentalId,
                poolsConfig.tokens.USDC,
                amountIn,
                minOut,
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
                const feeCharged = parsed?.args.feeCharged;
                totalFees += feeCharged;
                console.log(`  ✅ Success! Fee earned: ${ethers.formatEther(feeCharged)} ETH`);
            }
        } else {
            // Swap WETH for USDC  
            const amountIn = ethers.parseEther("0.05");
            const minOut = 0n;

            console.log(`  Swapping 0.05 WETH...`);
            const tx = await flashLP.executeSwap(
                rentalId,
                poolsConfig.tokens.WETH,
                amountIn,
                minOut,
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
                const feeCharged = parsed?.args.feeCharged;
                totalFees += feeCharged;
                console.log(`  ✅ Success! Fee earned: ${ethers.formatEther(feeCharged)} ETH`);
            }
        }
        console.log();
    }

    // Step 4: View results
    console.log("═══════════════════════════════════");
    console.log("📊 Final Analytics");
    console.log("═══════════════════════════════════\n");

    const rental = await flashLP.getRental(rentalId);
    const profits = await flashLP.getRentalProfits(rentalId);

    console.log(`Rental #${rentalId} Stats:`);
    console.log(`  Total Swaps: ${rental.swapCount}`);
    console.log(`  Total Volume: ${ethers.formatEther(rental.totalVolume)} ETH`);
    console.log(`  Total Fees: ${ethers.formatEther(totalFees)} ETH\n`);

    console.log(`💰 Profit Breakdown:`);
    console.log(`  Fees Earned:   +${ethers.formatEther(profits.totalFeesEarned)} ETH`);
    console.log(`  Rental Cost:   -${ethers.formatEther(profits.rentalCostPaid)} ETH`);
    console.log(`  Est. Gas Cost: -${ethers.formatEther(profits.gasCostEstimate)} ETH`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Net Profit:     ${ethers.formatEther(profits.netProfit)} ETH`);
    console.log(`  ROI:            ${Number(profits.roi) / 100}%\n`);

    console.log("🎉 Demo Complete!");
    console.log("\n✅ Visit http://localhost:3000/analytics to see your rental!");
    console.log(`   Rental ID: ${rentalId}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
