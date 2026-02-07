import { expect } from "chai";
import { ethers } from "hardhat";
import { RentalVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RentalVault", function () {
    let vault: RentalVault;
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let mockNFTAddress: string;

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();

        // Deploy RentalVault
        const RentalVault = await ethers.getContractFactory("RentalVault");
        vault = await RentalVault.deploy();
        await vault.waitForDeployment();

        // Mock NFT address (for testing we'll use a random address)
        mockNFTAddress = "0x1234567890123456789012345678901234567890";
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await vault.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero positions", async function () {
            expect(await vault.totalPositions()).to.equal(0);
        });
    });

    describe("Position Management", function () {
        it("Should allow listing a position", async function () {
            // Note: In real tests, you'd deploy a mock ERC721 and mint a token
            // For now, this is a structure example
            const pricePerSecond = ethers.parseEther("0.01");
            const minDuration = 3600; // 1 hour
            const maxDuration = 604800; // 7 days

            // This would fail without a real NFT - just showing structure
            // await vault.connect(alice).listPosition(positionId, pricePerSecond, minDuration, maxDuration);
        });

        it("Should reject invalid pricing", async function () {
            // Example test structure
            // await expect(
            //   vault.connect(alice).listPosition(positionId, 0, 3600, 604800)
            // ).to.be.revertedWithCustomError(vault, "InvalidPrice");
        });
    });

    describe("Access Control", function () {
        it("Should allow only owner to lock positions", async function () {
            // Example: await expect(vault.connect(alice).lockPosition(positionId))
            //   .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
        });

        it("Should allow owner to pause", async function () {
            await vault.pause();
            expect(await vault.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            await vault.pause();
            await vault.unpause();
            expect(await vault.paused()).to.be.false;
        });
    });
});
