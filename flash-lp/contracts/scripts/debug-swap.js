const hre = require("hardhat");

async function main() {
    console.log("🔍 DETAILED SWAP DEBUG\n");

    const [deployer] = await hre.ethers.getSigners();
    const poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");

    const flashLPAddress = poolsConfig.flashLP;
    const flashLP = await hre.ethers.getContractAt("FlashLP", flashLPAddress);
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

    console.log("Using contract:", flashLPAddress);
    console.log("Deployer:", deployer.address, "\n");

    // Check if rental exists
    const rentals = await flashLP.getRenterRentals(deployer.address);
    console.log("Existing rentals:", rentals.length);

    let rentalId;
    if (rentals.length > 0) {
        rentalId = rentals[0];
        console.log("Using existing rental:", rentalId.toString());
    } else {
        console.log("Creating new rental...");
        const tx = await flashLP.rentPool(2, 3600, hre.ethers.parseEther("0.00001"), {
            value: hre.ethers.parseEther("0.05"),
            gasLimit: 500000
        });
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => {
            try { return flashLP.interface.parseLog(log)?.name === 'RentalCreated'; } catch { return false; }
        });
        rentalId = flashLP.interface.parseLog(event)?.args.rentalId;
        console.log("Created rental:", rentalId.toString());
    }

    // Get pool details
    const rental = await flashLP.getRental(rentalId);
    const pool = await flashLP.getPool(rental.poolId);

    console.log("\n═══ POOL STATE ═══");
    console.log("Pool ID:", rental.poolId.toString());
    console.log("Token0:", pool.token0);
    console.log("Token1:", pool.token1);
    console.log("Reserve0:", hre.ethers.formatUnits(pool.amount0, 6), "USDT");
    console.log("Reserve1:", hre.ethers.formatEther(pool.amount1), "WETH");
    console.log("Exists:", pool.exists);

    // Setup tokens
    const usdt = MockERC20.attach(poolsConfig.tokens.USDT);
    const weth = MockERC20.attach(poolsConfig.tokens.WETH);

    console.log("\n═══ TOKEN SETUP ═══");

    // Check balances BEFORE minting
    let usdtBal = await usdt.balanceOf(deployer.address);
    let wethBal = await weth.balanceOf(deployer.address);
    console.log("USDT balance before mint:", hre.ethers.formatUnits(usdtBal, 6));
    console.log("WETH balance before mint:", hre.ethers.formatEther(wethBal));

    // Mint tokens
    console.log("\nMinting 500 USDT...");
    await (await usdt.mint(deployer.address, hre.ethers.parseUnits("500", 6))).wait();
    console.log("Minting 0.5 WETH...");
    await (await weth.mint(deployer.address, hre.ethers.parseEther("0.5"))).wait();

    // Check balances AFTER minting
    usdtBal = await usdt.balanceOf(deployer.address);
    wethBal = await weth.balanceOf(deployer.address);
    console.log("\nUSDT balance after mint:", hre.ethers.formatUnits(usdtBal, 6));
    console.log("WETH balance after mint:", hre.ethers.formatEther(wethBal));

    // Approve
    console.log("\nApproving FlashLP...");
    await (await usdt.approve(flashLPAddress, hre.ethers.MaxUint256)).wait();
    await (await weth.approve(flashLPAddress, hre.ethers.MaxUint256)).wait();

    // Check allowances
    const usdtAllowance = await usdt.allowance(deployer.address, flashLPAddress);
    const wethAllowance = await weth.allowance(deployer.address, flashLPAddress);
    console.log("USDT allowance:", hre.ethers.formatUnits(usdtAllowance, 6));
    console.log("WETH allowance:", hre.ethers.formatEther(wethAllowance));

    // Try swap
    console.log("\n═══ ATTEMPTING SWAP ═══");
    const amountIn = hre.ethers.parseUnits("100", 6); // 100 USDT
    console.log("Swapping:", hre.ethers.formatUnits(amountIn, 6), "USDT");
    console.log("Token In:", poolsConfig.tokens.USDT);
    console.log("Rental ID:", rentalId.toString());
    console.log("Min Out: 0");

    try {
        console.log("\nCalling executeSwap...");
        const tx = await flashLP.executeSwap(
            rentalId,
            poolsConfig.tokens.USDT,
            amountIn,
            0n,
            { gasLimit: 1000000 }
        );

        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("\n✅ TRANSACTION CONFIRMED!");
        console.log("Block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        // Check for events
        const swapEvent = receipt.logs.find(log => {
            try {
                const parsed = flashLP.interface.parseLog(log);
                return parsed?.name === 'SwapExecuted';
            } catch {
                return false;
            }
        });

        if (swapEvent) {
            const parsed = flashLP.interface.parseLog(swapEvent);
            console.log("\n🎉 SWAP EVENT FOUND!");
            console.log("Amount Out:", hre.ethers.formatEther(parsed.args.amountOut), "WETH");
            console.log("Fee Charged:", hre.ethers.formatEther(parsed.args.feeCharged), "ETH");
        } else {
            console.log("\n⚠️  No SwapExecuted event found");
        }

        // Check updated rental
        const updatedRental = await flashLP.getRental(rentalId);
        console.log("\n📊 Updated Rental:");
        console.log("Swap Count:", updatedRental.swapCount.toString());
        console.log("Fees Earned:", hre.ethers.formatEther(updatedRental.totalFeesEarned));

    } catch (error) {
        console.log("\n❌ SWAP FAILED!");
        console.log("\nError name:", error.name);
        console.log("Error message:", error.message);

        if (error.data) {
            console.log("\nError data:", error.data);
        }

        if (error.reason) {
            console.log("\nRevert reason:", error.reason);
        }

        if (error.code) {
            console.log("\nError code:", error.code);
        }

        console.log("\n📋 Full error:");
        console.log(JSON.stringify(error, null, 2).substring(0, 1000));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n💥 SCRIPT ERROR:");
        console.error(error);
        process.exit(1);
    });
