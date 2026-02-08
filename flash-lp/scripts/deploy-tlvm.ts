import { ethers, network } from "hardhat";

async function main() {
    console.log(`🚀 Deploying TLVM Protocol to ${network.name}...`);

    // Explicitly set up provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    console.log("Deploying with account:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance));

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
        // 1. Deploy TemporalAMM
        console.log("\nDeploying TemporalAMM...");
        const TemporalAMM = await ethers.getContractFactory("TemporalAMM", wallet);
        const temporalAMM = await TemporalAMM.deploy();
        await temporalAMM.waitForDeployment();
        console.log(`✅ TemporalAMM deployed to: ${await temporalAMM.getAddress()}`);

        await delay(5000);

        // 2. Deploy VirtualLiquidityManager
        console.log("\nDeploying VirtualLiquidityManager...");
        const VirtualLiquidityManager = await ethers.getContractFactory("VirtualLiquidityManager", wallet);
        const virtualLiquidityManager = await VirtualLiquidityManager.deploy();
        await virtualLiquidityManager.waitForDeployment();
        console.log(`✅ VirtualLiquidityManager deployed to: ${await virtualLiquidityManager.getAddress()}`);

        await delay(5000);

        // 3. Deploy PredictiveCommitment
        console.log("\nDeploying PredictiveCommitment...");
        const PredictiveCommitment = await ethers.getContractFactory("PredictiveCommitment", wallet);
        const predictiveCommitment = await PredictiveCommitment.deploy(ethers.ZeroAddress);
        await predictiveCommitment.waitForDeployment();
        console.log(`✅ PredictiveCommitment deployed to: ${await predictiveCommitment.getAddress()}`);

        await delay(5000);

        // 4. Deploy TLVMCore
        console.log("\nDeploying TLVMCore...");
        const TLVMCore = await ethers.getContractFactory("TLVMCore", wallet);
        const tlvmCore = await TLVMCore.deploy(
            await temporalAMM.getAddress(),
            await predictiveCommitment.getAddress(),
            await virtualLiquidityManager.getAddress()
        );
        await tlvmCore.waitForDeployment();
        console.log(`✅ TLVMCore deployed to: ${await tlvmCore.getAddress()}`);

        console.log("\n🎉 TLVM Protocol Deployment Complete!");
        console.log("----------------------------------------------------");
        console.log(`TemporalAMM:            ${await temporalAMM.getAddress()}`);
        console.log(`VirtualLiquidityManager: ${await virtualLiquidityManager.getAddress()}`);
        console.log(`PredictiveCommitment:    ${await predictiveCommitment.getAddress()}`);
        console.log(`TLVMCore:               ${await tlvmCore.getAddress()}`);
        console.log("----------------------------------------------------");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
