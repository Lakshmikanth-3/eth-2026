const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    console.log("Checking wallet status...");

    const rpcUrl = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error("❌ PRIVATE_KEY missing in .env");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log(`Address: ${wallet.address}`);

        const balance = await provider.getBalance(wallet.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (balance === 0n) {
            console.warn("⚠️  Wallet has 0 ETH!");
        } else {
            console.log("✅ Wallet ready.");
        }

    } catch (error) {
        console.error("❌ Wallet check failed:", error.message);
    }
}

main();
