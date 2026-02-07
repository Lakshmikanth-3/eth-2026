import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x8BC377c95BcF6B14c270dbA2597c3034adeb4815"; // Base Sepolia

async function main() {
    const FlashLP = await ethers.getContractFactory("UnifiedFlashLP");
    const contract = FlashLP.attach(CONTRACT_ADDRESS);

    console.log(`Checking Pool 2 on ${CONTRACT_ADDRESS}...`);

    try {
        const pool = await contract.getPool(2);
        console.log("Pool 2 Data:", pool);
        console.log("Pool 2 Exists:", pool.exists);
    } catch (error) {
        console.error("Error fetching pool:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
