const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY missing in .env");
    }

    console.log(`🚀 Deploying TLVM Protocol to Base Sepolia (${rpcUrl})...`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Deployer: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    // Helper to load artifact
    const loadArtifact = (contractName, fileName) => {
        const artifactPath = path.resolve(
            __dirname,
            `../contracts/artifacts/contracts/src/${fileName}.sol/${contractName}.json`
        );
        return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    };

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
        // 1. Deploy TemporalAMM
        console.log("\n1️⃣  Deploying TemporalAMM...");
        const TemporalAMMArtifact = loadArtifact("TemporalAMM", "TemporalAMM");
        const TemporalAMMFactory = new ethers.ContractFactory(TemporalAMMArtifact.abi, TemporalAMMArtifact.bytecode, wallet);
        const temporalAMM = await TemporalAMMFactory.deploy();
        console.log(`   Tx sent: ${temporalAMM.deploymentTransaction().hash}`);
        await temporalAMM.waitForDeployment();
        const temporalAMMAddress = await temporalAMM.getAddress();
        console.log(`   ✅ Deployed to: ${temporalAMMAddress}`);

        await delay(5000);

        // 2. Deploy VirtualLiquidityManager
        console.log("\n2️⃣  Deploying VirtualLiquidityManager...");
        const VLManagerArtifact = loadArtifact("VirtualLiquidityManager", "VirtualLiquidityManager");
        const VLManagerFactory = new ethers.ContractFactory(VLManagerArtifact.abi, VLManagerArtifact.bytecode, wallet);
        const vlManager = await VLManagerFactory.deploy();
        console.log(`   Tx sent: ${vlManager.deploymentTransaction().hash}`);
        await vlManager.waitForDeployment();
        const vlManagerAddress = await vlManager.getAddress();
        console.log(`   ✅ Deployed to: ${vlManagerAddress}`);

        await delay(5000);

        // 3. Deploy PredictiveCommitment
        console.log("\n3️⃣  Deploying PredictiveCommitment...");
        const PredCommitArtifact = loadArtifact("PredictiveCommitment", "PredictiveCommitment");
        const PredCommitFactory = new ethers.ContractFactory(PredCommitArtifact.abi, PredCommitArtifact.bytecode, wallet);
        const predCommit = await PredCommitFactory.deploy(ethers.ZeroAddress);
        console.log(`   Tx sent: ${predCommit.deploymentTransaction().hash}`);
        await predCommit.waitForDeployment();
        const predCommitAddress = await predCommit.getAddress();
        console.log(`   ✅ Deployed to: ${predCommitAddress}`);

        await delay(5000);

        // 4. Deploy TLVMCore
        console.log("\n4️⃣  Deploying TLVMCore...");
        const TLVMCoreArtifact = loadArtifact("TLVMCore", "TLVMCore");
        const TLVMCoreFactory = new ethers.ContractFactory(TLVMCoreArtifact.abi, TLVMCoreArtifact.bytecode, wallet);
        const tlvmCore = await TLVMCoreFactory.deploy(
            temporalAMMAddress,
            predCommitAddress,
            vlManagerAddress
        );
        console.log(`   Tx sent: ${tlvmCore.deploymentTransaction().hash}`);
        await tlvmCore.waitForDeployment();
        const tlvmCoreAddress = await tlvmCore.getAddress();
        console.log(`   ✅ Deployed to: ${tlvmCoreAddress}`);

        console.log("\n🎉 Deployment Complete!");
        console.log("----------------------------------------------------");
        console.log(`TemporalAMM:            ${temporalAMMAddress}`);
        console.log(`VirtualLiquidityManager: ${vlManagerAddress}`);
        console.log(`PredictiveCommitment:    ${predCommitAddress}`);
        console.log(`TLVMCore:               ${tlvmCoreAddress}`);
        console.log("----------------------------------------------------");

        const deploymentData = {
            network: rpcUrl.includes("arbitrum") ? "arbitrumSepolia" : "baseSepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                TemporalAMM: temporalAMMAddress,
                VirtualLiquidityManager: vlManagerAddress,
                PredictiveCommitment: predCommitAddress,
                TLVMCore: tlvmCoreAddress
            }
        };

        const logFile = path.resolve(__dirname, "../deployed_addresses.json");
        let existingData = [];
        if (fs.existsSync(logFile)) {
            existingData = JSON.parse(fs.readFileSync(logFile, "utf8"));
        }
        existingData.push(deploymentData);
        fs.writeFileSync(logFile, JSON.stringify(existingData, null, 2));
        console.log(`\n📝 Saved deployment to ${logFile}`);

    } catch (error) {
        console.error("\n❌ Deployment Failed:", error);
    }
}

main();
