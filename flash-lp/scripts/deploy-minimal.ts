import { ethers } from "hardhat";

async function main() {
    console.log("Deploying minimal test...");

    const TemporalAMM = await ethers.getContractFactory("TemporalAMM");
    const contract = await TemporalAMM.deploy();

    console.log("Tx sent:", contract.deploymentTransaction()?.hash);

    await contract.waitForDeployment();

    console.log("Deployed to:", await contract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
