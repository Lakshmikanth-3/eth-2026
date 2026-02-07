
const hre = require("hardhat");

async function main() {
    const address = process.env.CONTRACT_ADDRESS;

    if (!address) {
        console.error("Please provide CONTRACT_ADDRESS env var");
        process.exit(1);
    }

    console.log("Creating pool on contract:", address);

    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const contract = UnifiedFlashLP.attach(address);

    // Real Base Sepolia tokens
    const token0 = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC on Base Sepolia
    const token1 = "0x4200000000000000000000000000000000000006"; // WETH on Base Sepolia

    console.log("Creating USDC/WETH Pool...");
    console.log("  Token 0 (USDC):", token0);
    console.log("  Token 1 (WETH):", token1);

    // createPool(token0, token1, amount0, amount1)
    const tx = await contract.createPool(token0, token1, 0, 0); // 0 amounts to avoid needing real tokens/approval
    await tx.wait();

    console.log("✅ USDC/WETH Pool created! Tx:", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
