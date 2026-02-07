import { expect } from "chai"
import hre, { ethers } from "hardhat"
import { YellowChannelManager } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { time } from "@nomicfoundation/hardhat-network-helpers"

describe("YellowChannelManager", function () {
    let manager: YellowChannelManager
    let owner: SignerWithAddress
    let alice: SignerWithAddress
    let bob: SignerWithAddress

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners()

        const YellowChannelManager = await ethers.getContractFactory("YellowChannelManager")
        manager = await YellowChannelManager.deploy()
        await manager.waitForDeployment()
    })

    describe("Rental Channel Creation", function () {
        it("Should create a rental channel with correct parameters", async function () {
            const rentalId = 1
            const deposit = ethers.parseEther("1")
            const duration = 3600 // 1 hour

            const tx = await manager.connect(alice).createRentalChannel(
                rentalId,
                alice.address,
                bob.address,
                duration,
                { value: deposit }
            )

            const receipt = await tx.wait()
            const event = receipt?.logs.find((log: any) => {
                try {
                    return manager.interface.parseLog(log as any)?.name === "ChannelOpened"
                } catch {
                    return false
                }
            })

            expect(event).to.not.be.undefined

            // Get channel ID from rental mapping
            const channelId = await manager.getRentalChannel(rentalId)
            expect(channelId).to.not.equal(ethers.ZeroHash)

            // Verify channel details
            const channel = await manager.getChannel(channelId)
            expect(channel.participant1).to.equal(alice.address)
            expect(channel.participant2).to.equal(bob.address)
            expect(channel.balance1).to.equal(deposit)
            expect(channel.balance2).to.equal(0)
            expect(channel.isActive).to.be.true
        })

        it("Should prevent creating duplicate rental channels", async function () {
            const rentalId = 1
            const deposit = ethers.parseEther("1")

            await manager.connect(alice).createRentalChannel(
                rentalId,
                alice.address,
                bob.address,
                3600,
                { value: deposit }
            )

            await expect(
                manager.connect(alice).createRentalChannel(
                    rentalId,
                    alice.address,
                    bob.address,
                    3600,
                    { value: deposit }
                )
            ).to.be.revertedWith("Rental channel exists")
        })

        it("Should require non-zero deposit", async function () {
            await expect(
                manager.connect(alice).createRentalChannel(
                    1,
                    alice.address,
                    bob.address,
                    3600,
                    { value: 0 }
                )
            ).to.be.revertedWith("Insufficient deposit")
        })
    })

    describe("Channel Updates", function () {
        let channelId: string

        beforeEach(async function () {
            const tx = await manager.connect(alice).createRentalChannel(
                1,
                alice.address,
                bob.address,
                3600,
                { value: ethers.parseEther("1") }
            )
            await tx.wait()
            channelId = await manager.getRentalChannel(1)
        })

        it("Should update channel balances with valid signatures", async function () {
            const newBalance1 = ethers.parseEther("0.7")
            const newBalance2 = ethers.parseEther("0.3")
            const nonce = 1

            // Create message hash
            const messageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256", "uint256"],
                [channelId, newBalance1, newBalance2, nonce]
            )

            const ethSignedHash = ethers.solidityPackedKeccak256(
                ["string", "bytes32"],
                ["\x19Ethereum Signed Message:\n32", messageHash]
            )

            // Sign with both participants
            const sig1 = await alice.signMessage(ethers.getBytes(messageHash))
            const sig2 = await bob.signMessage(ethers.getBytes(messageHash))

            await manager.updateChannel(
                channelId,
                newBalance1,
                newBalance2,
                nonce,
                sig1,
                sig2
            )

            const channel = await manager.getChannel(channelId)
            expect(channel.balance1).to.equal(newBalance1)
            expect(channel.balance2).to.equal(newBalance2)
            expect(channel.nonce).to.equal(nonce)
        })

        it("Should reject invalid balance totals", async function () {
            const newBalance1 = ethers.parseEther("0.7")
            const newBalance2 = ethers.parseEther("0.4") // Total = 1.1 ETH != 1 ETH
            const nonce = 1

            const messageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256", "uint256"],
                [channelId, newBalance1, newBalance2, nonce]
            )

            const sig1 = await alice.signMessage(ethers.getBytes(messageHash))
            const sig2 = await bob.signMessage(ethers.getBytes(messageHash))

            await expect(
                manager.updateChannel(channelId, newBalance1, newBalance2, nonce, sig1, sig2)
            ).to.be.revertedWithCustomError(manager, "InvalidBalances")
        })
    })

    describe("Channel Closing", function () {
        let channelId: string

        beforeEach(async function () {
            const tx = await manager.connect(alice).createRentalChannel(
                1,
                alice.address,
                bob.address,
                3600,
                { value: ethers.parseEther("1") }
            )
            await tx.wait()
            channelId = await manager.getRentalChannel(1)
        })

        it("Should close channel cooperatively and transfer balances", async function () {
            const finalBalance1 = ethers.parseEther("0.6")
            const finalBalance2 = ethers.parseEther("0.4")
            const nonce = 5

            const messageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256", "uint256", "string"],
                [channelId, finalBalance1, finalBalance2, nonce, "close"]
            )

            const sig1 = await alice.signMessage(ethers.getBytes(messageHash))
            const sig2 = await bob.signMessage(ethers.getBytes(messageHash))

            const aliceBalanceBefore = await ethers.provider.getBalance(alice.address)
            const bobBalanceBefore = await ethers.provider.getBalance(bob.address)

            await manager.closeChannel(channelId, finalBalance1, finalBalance2, nonce, sig1, sig2)

            const channel = await manager.getChannel(channelId)
            expect(channel.isActive).to.be.false

            const aliceBalanceAfter = await ethers.provider.getBalance(alice.address)
            const bobBalanceAfter = await ethers.provider.getBalance(bob.address)

            expect(bobBalanceAfter).to.equal(bobBalanceBefore + finalBalance2)
            // Alice gets finalBalance1 but pays gas, so just check it increased
            expect(aliceBalanceAfter).to.be.greaterThan(aliceBalanceBefore)
        })
    })

    describe("Dispute Resolution", function () {
        let channelId: string

        beforeEach(async function () {
            const tx = await manager.connect(alice).createRentalChannel(
                1,
                alice.address,
                bob.address,
                3600,
                { value: ethers.parseEther("1") }
            )
            await tx.wait()
            channelId = await manager.getRentalChannel(1)
        })

        it("Should allow participants to start a dispute", async function () {
            await manager.connect(alice).startDispute(channelId)

            const channel = await manager.getChannel(channelId)
            expect(channel.isDisputed).to.be.true
            expect(channel.timeout).to.be.greaterThan(0)
        })

        it("Should allow owner to resolve dispute after timeout", async function () {
            await manager.connect(alice).startDispute(channelId)

            // Fast forward past dispute timeout (24 hours)
            await time.increase(24 * 3600 + 1)

            const finalBalance1 = ethers.parseEther("0.5")
            const finalBalance2 = ethers.parseEther("0.5")

            await manager.resolveDispute(channelId, finalBalance1, finalBalance2)

            const channel = await manager.getChannel(channelId)
            expect(channel.isActive).to.be.false
            expect(channel.isDisputed).to.be.false
        })
    })
})
