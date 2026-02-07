
const hre = require("hardhat");

async function main() {
    const address = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; // The address we are using
    const provider = hre.ethers.provider;

    console.log("Checking address:", address);

    // 1. Check code
    const code = await provider.getCode(address);
    if (code === "0x") {
        console.error("❌ NO CODE at this address! It is not a contract.");
        return;
    }
    console.log("✅ Contract code exists.");

    // 2. Check Pool 1
    const UnifiedFlashLP = await hre.ethers.getContractFactory("UnifiedFlashLP");
    const contract = UnifiedFlashLP.attach(address);

    try {
        const pool = await contract.pools(1);
        console.log("Pool 1 info:", pool);
        if (pool.exists) {
            console.log("✅ Pool 1 exists.");
        } else {
            console.error("❌ Pool 1 does NOT exist.");
        }
    } catch (e) {
        console.error("❌ Failed to query pools:", e);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
