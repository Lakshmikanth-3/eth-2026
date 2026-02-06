import { ethers } from "hardhat";

async function main() {
    console.log("🚀 FINAL TEST: Execute Swaps on FIXED Contract\n");

    const [deployer] = await ethers.getSigners();
    const poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");

    // NEW FIXED CONTRACT
    const flashLPAddress = poolsConfig.flashLP;
    console.log("Contract Address:", flashLPAddress);
    console.log("Expected (NEW):", "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567\n");

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);
    const MockERC20 = await ethers.getContractFactory("MockERC20");

    // Rent pool #2
    console.log("Step 1: Renting Pool #2...");
    const duration = 3600; // 1 hour
    const pricePerSecond = ethers.parseEther("0.00001");
    const rentalCost = BigInt(duration) * pricePerSecond;
    const collateral = (rentalCost * 120n) / 100n;

    const rentTx = await flashLP.rentPool(2, duration, pricePerSecond, {
        value: collateral,
        gasLimit: 500000
    });

    const receipt = await rentTx.wait();
    const rentalEvent = receipt.logs.find((log) => {
        try {
            return flashLP.interface.parseLog(log)?.name === 'RentalCreated';
        } catch {
            return false;
        }
    });

    const rentalId = flashLP.interface.parseLog(rentalEvent)?.args.rentalId;
    console.log("✅ Rental ID:", rentalId.toString(), "\n");

    // Mint and approve
    console.log("Step 2: Minting tokens...");
    const usdt = MockERC20.attach(poolsConfig.tokens.USDT);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    await (await usdt.mint(deployer.address, ethers.parseUnits("1000", 6))).wait();
    await (await weth.mint(deployer.address, ethers.parseEther("1"))).wait();
    await (await usdt.approve(flashLPAddress, ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Tokens ready\n");

    // Execute 3 swaps
    console.log("Step 3: Executing 3 swaps...\n");

    for (let i = 1; i <= 3; i++) {
        console.log(`Swap #${i}:`);
        try {
            const tokenIn = i % 2 === 1 ? poolsConfig.tokens.USDT : poolsConfig.tokens.WETH;
            const amountIn = i % 2 === 1 ? ethers.parseUnits("100", 6) : ethers.parseEther("0.05");

            const swapTx = await flashLP.executeSwap(rentalId, tokenIn, amountIn, 0n, {
                gasLimit: 500000
            });

            const swapReceipt = await swapTx.wait();
            const swapEvent = swapReceipt.logs.find((log) => {
                try {
                    return flashLP.interface.parseLog(log)?.name === 'SwapExecuted';
                } catch {
                    return false;
                }
            });

            if (swapEvent) {
                const parsed = flashLP.interface.parseLog(swapEvent);
                console.log(`  ✅ Swap successful!`);
                console.log(`  Fee earned: ${ethers.formatEther(parsed.args.feeCharged)} ETH\n`);
            }
        } catch (error: any) {
            console.log(`  ❌ Failed:`, error.message.substring(0, 100), "\n");
        }
    }

    // Check results
    console.log("═══════════════════════════════════════════");
    const rental = await flashLP.getRental(rentalId);
    const profits = await flashLP.getRentalProfits(rentalId);

    console.log(`📊 Final Results:`);
    console.log(`  Rental ID: ${rentalId}`);
    console.log(`  Swaps Executed: ${rental.swapCount} / 3`);
    console.log(`  Total Fees: ${ethers.formatEther(rental.totalFeesEarned)} ETH`);
    console.log(`  Net Profit: ${ethers.formatEther(profits.netProfit)} ETH`);
    console.log(`  ROI: ${Number(profits.roi) / 100}%\n`);

    if (rental.swapCount > 0) {
        console.log("🎉 SUCCESS! Swaps executed on FIXED contract!");
        console.log(`\n✨ Check analytics: http://localhost:3000/api/rentals/${rentalId}?chainId=421614`);
    } else {
        console.log("❌ FAILED: Swaps did not execute");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
