const hre = require("hardhat");

async function main() {
    console.log("🔍 SIMPLE DEBUG SIMULATION\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Wallet:", deployer.address);

    // HARDCODED ADDRESSES (Arbitrum Sepolia)
    const FLASH_LP = "0x69F6115E380A92Fd23eDdf4E89aB6d2d178DC567";
    const USDT = "0x4A02627177043F6F1EBd007087684778cD34B22C";

    // Get Contract Instances
    const FlashLP = await hre.ethers.getContractFactory("FlashLP");
    const flashLP = FlashLP.attach(FLASH_LP);
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const usdt = MockERC20.attach(USDT);

    // 1. Get Active Rental
    console.log("Fetching rental...");
    const rentals = await flashLP.getRenterRentals(deployer.address);
    if (rentals.length === 0) {
        console.log("❌ No rentals found!");
        return;
    }
    const rentalId = rentals[rentals.length - 1];
    console.log("Rental ID:", rentalId.toString());

    // 3. Setup WETH Swap
    const WETH_ADDR = "0x17a32617e933CF2E01FcAAc5BCA88CC2ca995643";
    const weth = MockERC20.attach(WETH_ADDR);

    const tokenIn = WETH_ADDR;
    const amountIn = hre.ethers.parseEther("0.05"); // 0.05 WETH

    console.log("\nSwap Params (WETH -> USDT):");
    console.log("TokenIn:", tokenIn);
    console.log("AmountIn:", amountIn.toString());

    // Check Balance/Allowance for WETH
    const balW = await weth.balanceOf(deployer.address);
    const allowW = await weth.allowance(deployer.address, FLASH_LP);
    console.log("WETH Balance:", hre.ethers.formatEther(balW));
    console.log("WETH Allowance:", hre.ethers.formatEther(allowW));

    if (balW < amountIn) {
        console.log("Minting WETH...");
        await (await weth.mint(deployer.address, amountIn * 10n)).wait();
        await (await weth.approve(FLASH_LP, hre.ethers.MaxUint256)).wait();
    }
    if (allowW < amountIn) {
        console.log("Approving WETH...");
        await (await weth.approve(FLASH_LP, hre.ethers.MaxUint256)).wait();
    }

    // 4. Simulate Swap
    console.log("\nSimulating executeSwap...");
    try {
        const gasEst = await flashLP.executeSwap.estimateGas(
            rentalId,
            tokenIn,
            amountIn,
            0n
        );
        console.log("✅ GAS ESTIMATE SUCCESS:", gasEst.toString());

        const result = await flashLP.executeSwap.staticCall(
            rentalId,
            tokenIn,
            amountIn,
            0n,
            { gasLimit: gasEst * 2n }
        );
        console.log("✅ SIMULATION SUCCESS! Amount Out:", result.toString());

    } catch (error) {
        console.log("❌ REVERTED!");
        // Try to obtain the revert reason strings
        if (error.reason) console.log("Reason:", error.reason);
        if (error.message) console.log("Message:", error.message);
        if (error.data) {
            console.log("Data:", error.data);
            try {
                const decoded = flashLP.interface.parseError(error.data);
                console.log("Decoded:", decoded);
            } catch {
                console.log("Could not decode data");
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
