import { ethers } from "hardhat";

async function main() {
    console.log("Checking Hardhat environment...");
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);
    console.log("Balance:", (await signer.provider?.getBalance(signer.address))?.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
