
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useSwitchChain } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import { parseEther, keccak256, toHex, pad } from 'viem'
import { useState } from 'react'
import toast from 'react-hot-toast'

// Map API chain names to Wagmi Chain IDs
const CHAIN_IDS: Record<string, number> = {
    'arbitrum': 421614, // Arbitrum Sepolia
    'base': 84532,      // Base Sepolia
    'optimism': 11155420 // Op Sepolia (if added later)
}

export function useRentPosition() {
    const currentChainId = useChainId()
    const { address } = useAccount()
    const { switchChainAsync } = useSwitchChain()
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    })

    const rent = async (positionId: string, owner: string, duration: number, pricePerSecond: number, chainName: string) => {
        if (!address) {
            toast.error('Please connect your wallet')
            return
        }

        // 1. Resolve Target Chain ID
        const targetChainId = CHAIN_IDS[chainName.toLowerCase()]
        if (!targetChainId) {
            toast.error(`Unsupported chain: ${chainName}`)
            return
        }

        // 2. Switch Chain if necessary
        if (currentChainId !== targetChainId) {
            try {
                toast.loading(`Switching to ${chainName}...`)
                await switchChainAsync({ chainId: targetChainId })
                toast.dismiss()
            } catch (error) {
                console.error('Failed to switch chain:', error)
                toast.error(`Failed to switch to ${chainName}`)
                return
            }
        }

        // 3. Get Contract Address for TARGET chain
        // @ts-ignore
        const addresses = CONTRACT_ADDRESSES[targetChainId as keyof typeof CONTRACT_ADDRESSES]
        if (!addresses) {
            toast.error(`Contracts not deployed on ${chainName}`)
            return
        }

        // 3.5 Validate contract addresses - check for placeholder values
        if (!addresses.RentalManager || addresses.RentalManager === '0x...' || addresses.RentalManager.length < 42) {
            toast.error(`Contracts not deployed on ${chainName}. Please use Base Sepolia or deploy contracts first.`)
            return
        }

        // 4. Convert pricePerSecond to wei (BigInt requires integers)
        // pricePerSecond is in ETH (e.g., 0.058 ETH), convert to wei
        const pricePerSecondWei = parseEther(pricePerSecond.toString())

        // 5. Calculate Collateral (120% of cost)
        const totalCost = BigInt(duration) * pricePerSecondWei
        const collateral = (totalCost * 12000n) / 10000n // 12000 bps = 120%



        // 6. Generate Mock Channel ID
        const channelId = keccak256(toHex(Date.now()))

        // 7. Convert positionId to bytes32 (contract expects 32 bytes, not 3)
        // positionId is "1", "2", etc. → convert to "0x1", "0x2" → pad to bytes32
        const positionIdBytes32 = pad(toHex(positionId), { size: 32 })

        try {
            // Call writeContract - this will trigger the wallet popup
            writeContract({
                address: addresses.RentalManager as `0x${string}`,
                abi: ABIS.RentalManager,
                functionName: 'createRental',
                args: [
                    positionIdBytes32,
                    owner as `0x${string}`,
                    BigInt(duration),
                    pricePerSecondWei, // Use wei amount
                    channelId
                ],
                value: collateral
            })
            // Don't show toast here - let the parent component handle UI feedback
        } catch (error) {
            console.error('Rental failed:', error)
            toast.error('Failed to initiate rental')
        }


    }

    return {
        rent,
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error: writeError
    }
}
