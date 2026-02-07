import { expect } from "chai"
import hre, { ethers } from "hardhat"
import { UnifiedFlashLP, YellowChannelManager } from "../typechain-types"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import { time } from "@nomicfoundation/hardhat-network-helpers"

describe("UnifiedFlashLP with Yellow Network", function () {
    let flashLP: UnifiedFlashLP
    let yellowManager: YellowChannelManager
    let owner: SignerWithAddress
    let poolOwner: SignerWithAddress
    let renter: SignerWithAddress

    beforeEach(async function () {
        [owner, poolOwner, renter] = await ethers.getSigners()

        // Deploy YellowChannelManager
        const YellowChannelManager = await ethers.getContractFactory("YellowChannelManager")
        yellowManager = await YellowChannelManager.deploy()
        await yellowManager.waitForDeployment()

        // Deploy UnifiedFlashLP with Yellow manager address
        const UnifiedFlashLP = await ethers.getContractFactory("UnifiedFlashLP")
        flashLP = await UnifiedFlashLP.deploy(await yellowManager.getAddress())
        await flashLP.waitForDeployment()
    })

    describe("Rental with Yellow Channel", function () {
        it("Should create rental with Yellow channel ID", async function () {
            // Create a pool first (with zero amounts for simplicity)
            const tx = await flashLP.connect(poolOwner).createPool(
                ethers.ZeroAddress, // Mock token0
                ethers.ZeroAddress, // Mock token1
                0,
                0
            )
            await tx.wait()

            const poolId = 1 // First pool

            // Create Yellow channel for rental
            const rentalId = 1
            const channelDeposit = ethers.parseEther("5")
            const channelTx = await yellowManager.connect(renter).createRentalChannel(
                rentalId,
                renter.address,
                poolOwner.address,
                3600, // 1 hour
                { value: channelDeposit }
            )
            await channelTx.wait()

            const channelId = await yellowManager.getRentalChannel(rentalId)

            // Rent pool with Yellow channel
            const duration = 3600
            const pricePerSecond = ethers.parseEther("0.00001")
            const cost = BigInt(duration) * pricePerSecond
            const collateral = (cost * BigInt(12000)) / BigInt(10000)

            const rentalTx = await flashLP.connect(renter).rentPool(
                poolId,
                duration,
                pricePerSecond,
                channelId,
                { value: collateral }
            )
            await rentalTx.wait()

            // Verify rental has channel ID
            const rental = await flashLP.getRental(rentalId)
            expect(rental.channelId).to.equal(channelId)
            expect(rental.isActive).to.be.true
            expect(rental.renter).to.equal(renter.address)
        })
    })

    describe("Settlement with Yellow Channel", function () {
        let channelId: string
        let rentalId: number

        beforeEach(async function () {
            // Create pool
            await flashLP.connect(poolOwner).createPool(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                0,
                0
            )

            // Create Yellow channel
            rentalId = 1
            const channelTx = await yellowManager.connect(renter).createRentalChannel(
                rentalId,
                renter.address,
                poolOwner.address,
                3600,
                { value: ethers.parseEther("5") }
            )
            await channelTx.wait()

            channelId = await yellowManager.getRentalChannel(rentalId)

            // Rent pool
            await flashLP.connect(renter).rentPool(
                1, // poolId
                3600, // duration
                ethers.parseEther("0.00001"),
                channelId,
                { value: ethers.parseEther("5") }
            )
        })

        it("Should settle rental and close Yellow channel", async function () {
            // Simulate time passing
            await time.increase(1800) // 30 minutes

            // Prepare final balances
            const finalBalance1 = ethers.parseEther("3") // Renter keeps 3 ETH
            const finalBalance2 = ethers.parseEther("2") // Owner gets 2 ETH in fees
            const nonce = 10

            // Sign final state
            const messageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256", "uint256", "string"],
                [channelId, finalBalance1, finalBalance2, nonce, "close"]
            )

            const sig1 = await renter.signMessage(ethers.getBytes(messageHash))
            const sig2 = await poolOwner.signMessage(ethers.getBytes(messageHash))

            const ownerBalanceBefore = await ethers.provider.getBalance(poolOwner.address)

            // Settle rental with Yellow
            await flashLP.connect(renter).settleRentalWithYellow(
                rentalId,
                finalBalance1,
                finalBalance2,
                nonce,
                sig1,
                sig2
            )

            // Verify rental is inactive
            const rental = await flashLP.getRental(rentalId)
            expect(rental.isActive).to.be.false

            // Verify Yellow channel is closed
            const channel = await yellowManager.getChannel(channelId)
            expect(channel.isActive).to.be.false

            // Verify owner received funds (minus platform fee)
            const platformFee = (finalBalance2 * BigInt(200)) / BigInt(10000) // 2% platform fee
            const ownerAmount = finalBalance2 - platformFee

            const ownerBalanceAfter = await ethers.provider.getBalance(poolOwner.address)
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + ownerAmount)
        })

        it("Should reject settlement without Yellow channel", async function () {
            // Create a rental without Yellow channel
            await flashLP.connect(poolOwner).createPool(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                0,
                0
            )

            const rentalTx = await flashLP.connect(renter).rentPool(
                2, // Different pool
                3600,
                ethers.parseEther("0.00001"),
                ethers.ZeroHash, // No channel ID
                { value: ethers.parseEther("5") }
            )
            await rentalTx.wait()

            await expect(
                flashLP.connect(renter).settleRentalWithYellow(
                    2, // This rental has no channel
                    ethers.parseEther("3"),
                    ethers.parseEther("2"),
                    1,
                    "0x00",
                    "0x00"
                )
            ).to.be.revertedWith("No Yellow channel")
        })

        it("Should only allow renter or owner to settle", async function () {
            const [, , , unauthorizedUser] = await ethers.getSigners()

            await expect(
                flashLP.connect(unauthorizedUser).settleRentalWithYellow(
                    rentalId,
                    ethers.parseEther("3"),
                    ethers.parseEther("2"),
                    1,
                    "0x00",
                    "0x00"
                )
            ).to.be.revertedWith("Not authorized")
        })
    })

    describe("Yellow Manager Configuration", function () {
        it("Should allow owner to update Yellow manager address", async function () {
            const newManager = ethers.Wallet.createRandom().address

            await flashLP.setYellowChannelManager(newManager)

            expect(await flashLP.yellowChannelManager()).to.equal(newManager)
        })

        it("Should reject zero address for Yellow manager", async function () {
            await expect(
                flashLP.setYellowChannelManager(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid address")
        })
    })
})
