import hre from "hardhat";

async function main() {
    const address = "0x5EB90d3429d4c5b5cEDA63ED2460a1A27CE42C00";

    console.log("Creating pool on contract:", address);

    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const contract = UnifiedFlashLP.attach(address);

    const token0 = "0x0000000000000000000000000000000000000001";
    const token1 = "0x0000000000000000000000000000000000000002";

    console.log("Creating Pool 1 with 0 liquidity...");

    try {
        const tx = await contract.createPool(token0, token1, 0, 0, {
            gasLimit: 500000
        });
        console.log("Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("✅ Pool 1 created! Block:", receipt.blockNumber);
    } catch (error: any) {
        console.error("❌ Failed:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
