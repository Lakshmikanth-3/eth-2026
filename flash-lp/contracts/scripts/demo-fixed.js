const hre = require("hardhat");

async function main() {
    console.log("🚀 FINAL FIXED DEMO: Real Swaps\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Wallet:", deployer.address);

    // FIXED ADDRESSES
    const FLASH_LP = "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567";
    const USDT_ADDR = "0x4A02627177043F6F1EBd007087684778cD34B22C";
    const WETH_ADDR = "0x17a32617e933CF2E01FcAAc5BCA88CC2ca995643";

    const FlashLP = await hre.ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(FLASH_LP);
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const usdt = MockERC20.attach(USDT_ADDR);
    const weth = MockERC20.attach(WETH_ADDR);

    // 1. Rent Pool #2
    console.log("\nStep 1: Renting Pool #2...");
    const duration = 3600;
    const price = hre.ethers.parseEther("0.00001");
    const cost = BigInt(duration) * price;
    const collateral = (cost * 120n) / 100n;

    let rentalId;
    try {
        const tx = await flashLP.rentPool(2, duration, price, {
            value: cost + collateral,
            gasLimit: 500000
        });
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => {
            try { return flashLP.interface.parseLog(log)?.name === 'RentalCreated'; } catch { return false; }
        });
        rentalId = flashLP.interface.parseLog(event)?.args.rentalId;
        console.log("✅ Rental ID:", rentalId.toString());
    } catch (e) {
        console.log("Rent failed (maybe already rented?):", e.message.substring(0, 100));
        // Try to get existing
        const rentals = await flashLP.getRenterRentals(deployer.address);
        if (rentals.length > 0) {
            rentalId = rentals[rentals.length - 1];
            console.log("Using existing Rental ID:", rentalId.toString());
        } else {
            throw e;
        }
    }

    // 2. Mint & Approve
    console.log("\nStep 2: Preparing tokens...");
    await (await usdt.mint(deployer.address, hre.ethers.parseUnits("1000", 6))).wait();
    await (await weth.mint(deployer.address, hre.ethers.parseEther("1"))).wait();
    await (await usdt.approve(FLASH_LP, hre.ethers.MaxUint256)).wait();
    await (await weth.approve(FLASH_LP, hre.ethers.MaxUint256)).wait();
    console.log("✅ Tokens minted and approved");

    // 3. Swap 1: USDT -> WETH
    console.log("\nStep 3: Execute Swap 1 (200 USDT -> WETH)...");
    try {
        const tx1 = await flashLP.executeSwap(
            rentalId,
            USDT_ADDR,
            hre.ethers.parseUnits("200", 6),
            0n,
            { gasLimit: 3000000 }
        );
        console.log("Tx sent:", tx1.hash);
        const r1 = await tx1.wait();
        const ev1 = r1.logs.find(l => {
            try { return flashLP.interface.parseLog(l)?.name === 'SwapExecuted'; } catch { return false; }
        });
        if (ev1) {
            const args = flashLP.interface.parseLog(ev1).args;
            console.log("✅ Swap 1 Success!");
            console.log("   Out:", hre.ethers.formatEther(args.amountOut), "WETH");
            console.log("   Fee:", hre.ethers.formatEther(args.feeCharged), "ETH");
        } else {
            console.log("⚠️ Tx confirmed but no event found?");
        }
    } catch (e) {
        console.error("❌ Swap 1 Failed:", e.message);
        throw e;
    }

    // 4. Swap 2: WETH -> USDT
    console.log("\nStep 4: Execute Swap 2 (0.05 WETH -> USDT)...");
    try {
        const tx2 = await flashLP.executeSwap(
            rentalId,
            WETH_ADDR,
            hre.ethers.parseEther("0.05"),
            0n,
            { gasLimit: 3000000 }
        );
        console.log("Tx sent:", tx2.hash);
        const r2 = await tx2.wait();
        const ev2 = r2.logs.find(l => {
            try { return flashLP.interface.parseLog(l)?.name === 'SwapExecuted'; } catch { return false; }
        });
        if (ev2) {
            const args = flashLP.interface.parseLog(ev2).args;
            console.log("✅ Swap 2 Success!");
            console.log("   Out:", hre.ethers.formatUnits(args.amountOut, 6), "USDT");
            console.log("   Fee:", hre.ethers.formatEther(args.feeCharged), "ETH");
        } else {
            console.log("⚠️ Tx confirmed but no event found?");
        }
    } catch (e) {
        console.error("❌ Swap 2 Failed:", e.message);
        throw e;
    }

    console.log("\n🎉 DEMO SUCCESS! Swaps executed correctly.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
