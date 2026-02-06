import { ethers } from "hardhat";

async function main() {
    console.log("🧪 Testing Single Swap Execution\n");

    const [deployer] = await ethers.getSigners();
    console.log("📝 Account:", deployer.address);
    console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);

    const flashLPAddress = "0x4dA5E73b31Ef989AaFCB54d8dFe4b8235172F055";
    const poolsConfig = require("../../deployments/arbitrumSepolia_pools.json");

    console.log(`🌐 Chain ID: ${chainId}`);
    console.log(`📦 FlashLP: ${flashLPAddress}\n`);

    const FlashLP = await ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(flashLPAddress);

    const rentalId = 1n;

    // Check rental
    const rental = await flashLP.getRental(rentalId);
    console.log("Rental Info:");
    console.log(`  Renter: ${rental.renter}`);
    console.log(`  Your address: ${deployer.address}`);
    console.log(`  Active: ${rental.isActive}`);
    console.log(`  Swap Count: ${rental.swapCount}\n`);

    if (rental.renter.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ ERROR: You are not the renter!");
        console.log("The wallet that rented the pool is different from your current wallet.");
        return;
    }

    // Get pool info
    const pool = await flashLP.getPool(rental.poolId);
    console.log("Pool Info:");
    console.log(`  Token0: ${pool.token0} (reserve: ${ethers.formatUnits(pool.reserve0, 6)} USDC)`);
    console.log(`  Token1: ${pool.token1} (reserve: ${ethers.formatEther(pool.reserve1)} WETH)`);
    console.log(`  Owner: ${pool.owner}\n`);

    // Mint and approve tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(poolsConfig.tokens.USDC);

    console.log("Minting 1000 USDC...");
    await (await usdc.mint(deployer.address, ethers.parseUnits("1000", 6))).wait();
    console.log("✅ Minted\n");

    console.log("Approving FlashLP...");
    await (await usdc.approve(flashLPAddress, ethers.MaxUint256)).wait();
    console.log("✅ Approved\n");

    console.log("═══════════════════════════════════");
    console.log("Attempting Swap");
    console.log("═══════════════════════════════════\n");

    try {
        const amountIn = ethers.parseUnits("100", 6); // 100 USDC
        console.log(`Swapping 100 USDC for WETH...`);
        console.log(`  Rental ID: ${rentalId}`);
        console.log(`  Token In: ${poolsConfig.tokens.USDC} (USDC)`);
        console.log(`  Amount: ${ethers.formatUnits(amountIn, 6)} USDC`);
        console.log(`  Min Out: 0\n`);

        const tx = await flashLP.executeSwap(
            rentalId,
            poolsConfig.tokens.USDC,
            amountIn,
            0n,
            {
                gasLimit: 1000000 // High gas limit to avoid out-of-gas
            }
        );

        console.log("Transaction sent! Hash:", tx.hash);
        console.log("Waiting for confirmation...\n");

        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);

        // Parse events
        const swapEvents = receipt.logs.filter((log) => {
            try {
                const parsed = flashLP.interface.parseLog(log);
                return parsed?.name === 'SwapExecuted';
            } catch {
                return false;
            }
        });

        if (swapEvents.length > 0) {
            console.log("\n🎉 SWAP SUCCESSFUL!");
            const parsed = flashLP.interface.parseLog(swapEvents[0]);
            console.log(`  Amount Out: ${ethers.formatEther(parsed?.args.amountOut)} WETH`);
            console.log(`  Fee Charged: ${ethers.formatEther(parsed?.args.feeCharged)} ETH`);
        } else {
            console.log("\n⚠️ Transaction succeeded but no SwapExecuted event found");
        }

    } catch (error: any) {
        console.error("\n❌ SWAP FAILED!");
        console.error("\nError:", error.message);

        if (error.data) {
            console.error("\nError data:", error.data);
        }

        // Try to decode the revert reason
        if (error.reason) {
            console.error("\nRevert reason:", error.reason);
        }
    }

    console.log("\n✅ Test complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
