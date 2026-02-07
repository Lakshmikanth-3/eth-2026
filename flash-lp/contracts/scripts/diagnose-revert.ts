const hre = require("hardhat");

async function main() {
    console.log("🔍 DIAGNOSE REVERT REASON\n");

    const [deployer] = await hre.ethers.getSigners();
    const poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");
    const flashLPAddress = poolsConfig.flashLP;

    console.log("Wallet:", deployer.address);
    console.log("Contract:", flashLPAddress);

    const FlashLP = await hre.ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

    // 1. Get Rental
    const rentals = await flashLP.getRenterRentals(deployer.address);
    if (rentals.length === 0) {
        console.log("❌ No rentals found. Renting now...");
        // Rent logic (omitted for brevity, assuming rental exists from previous run)
        // If needed we can add rent logic here
        return;
    }
    const rentalId = rentals[rentals.length - 1]; // Use latest
    console.log("Using Rental ID:", rentalId.toString());

    const rental = await flashLP.getRental(rentalId);
    console.log("Pool ID:", rental.poolId);
    console.log("Active:", rental.isActive);
    console.log("End Time:", rental.endTime.toString(), "Current:", Math.floor(Date.now() / 1000));

    // 2. Get Pool
    const pool = await flashLP.getPool(rental.poolId);
    console.log("\nPool Tokens:");
    console.log("Token0:", pool.token0);
    console.log("Token1:", pool.token1);

    // 3. Setup Swap Params
    const tokenIn = poolsConfig.tokens.USDT; // Try USDT
    const amountIn = hre.ethers.parseUnits("100", 6); // 100 USDT

    console.log("\nSwap Params:");
    console.log("TokenIn:", tokenIn);
    console.log("AmountIn:", amountIn.toString());

    if (tokenIn.toLowerCase() !== pool.token0.toLowerCase() && tokenIn.toLowerCase() !== pool.token1.toLowerCase()) {
        console.log("❌ TOKEN MISMATCH! Input token is not in pool.");
        return;
    }

    // 4. Check Tokens
    const usdt = MockERC20.attach(tokenIn);
    const bal = await usdt.balanceOf(deployer.address);
    const allow = await usdt.allowance(deployer.address, flashLPAddress);

    console.log("\nToken Status:");
    console.log("Balance:", hre.ethers.formatUnits(bal, 6));
    console.log("Allowance:", hre.ethers.formatUnits(allow, 6));

    if (bal < amountIn) {
        console.log("❌ INSUFFICIENT BALANCE");
        return;
    }
    if (allow < amountIn) {
        console.log("❌ INSUFFICIENT ALLOWANCE");
        return;
    }

    // 5. Simulate Swap (callStatic)
    console.log("\nSimulating Swap...");
    try {
        const result = await flashLP.executeSwap.staticCall(
            rentalId,
            tokenIn,
            amountIn,
            0n,
            { gasLimit: 2000000 }
        );
        console.log("✅ SIMULATION SUCCESS!");
        console.log("Amount Out:", result.toString());
    } catch (error) {
        console.log("\n❌ SIMULATION REVERTED!");
        console.log("Error Name:", error.name);
        console.log("Error Reason:", error.reason);
        console.log("Error Message:", error.message);
        if (error.data) {
            console.log("Error Data:", error.data);
            // Try decoding
            try {
                const decoded = flashLP.interface.parseError(error.data);
                console.log("Decoded Error:", decoded);
            } catch (e) {
                console.log("Could not decode error data");
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
