import hre from "hardhat";

async function main() {
    const arbAddress = "0x5EB90d3429d4c5b5cEDA63ED2460a1A27CE42C00";

    console.log("Checking Arbitrum contract:", arbAddress);

    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const contract = UnifiedFlashLP.attach(arbAddress);

    const token0 = "0x0000000000000000000000000000000000000001";
    const token1 = "0x0000000000000000000000000000000000000002";

    console.log("Creating Pool 1...");

    try {
        const tx = await contract.createPool(token0, token1, 0, 0, {
            gasLimit: 500000,
            maxFeePerGas: hre.ethers.parseUnits("50", "gwei"),
            maxPriorityFeePerGas: hre.ethers.parseUnits("2", "gwei")
        });
        console.log("TX sent:", tx.hash);

        const receipt = await tx.wait(1);
        console.log("✅ Pool 1 created on Arbitrum! Block:", receipt?.blockNumber);
    } catch (error: any) {
        console.error("❌ Failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
