
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useSwitchChain } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import { parseEther, keccak256, toHex, pad } from 'viem'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

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
    const queryClient = useQueryClient()
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    })

    // Invalidate rentals cache when transaction confirms
    useEffect(() => {
        if (isConfirmed && address) {
            // Invalidate rentals to trigger immediate refetch
            queryClient.invalidateQueries({ queryKey: ['rentals', address] })
            // Also invalidate available positions since the pool might no longer be available
            queryClient.invalidateQueries({ queryKey: ['available-positions'] })

            toast.success('Rental confirmed! Dashboard is updating...')
        }
    }, [isConfirmed, address, queryClient])

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
        if (!addresses.FlashLP || addresses.FlashLP === '0x...' || addresses.FlashLP.length < 42) {
            toast.error(`Contracts not deployed on ${chainName}. Please use Base Sepolia or deploy contracts first.`)
            return
        }

        // 4. Convert pricePerSecond to wei (BigInt requires integers)
        // pricePerSecond is in ETH (e.g., 0.058 ETH), convert to wei
        const pricePerSecondWei = parseEther(pricePerSecond.toString())

        // 5. Calculate Collateral (120% of cost)
        const totalCost = BigInt(duration) * pricePerSecondWei
        const collateral = (totalCost * 12000n) / 10000n // 12000 bps = 120%




        // 6. Get Real Yellow Channel ID from Server
        let channelId: `0x${string}`
        try {
            toast.loading('Initializing Yellow Channel...')
            const response = await fetch('/api/yellow/open-channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // TODO: Map based on chain
                    amount: '0' // Initial 0 balance
                })
            })

            const data = await response.json()
            if (!data.channelId) throw new Error(data.error || 'Failed to get channel ID')

            channelId = data.channelId as `0x${string}`
            toast.dismiss()
            toast.success('Yellow Channel ready!')
        } catch (error) {
            console.error('Yellow setup failed:', error)
            toast.error('Failed to setup payment channel')
            return
        }

        // 7. Convert positionId to BigInt (UnifiedFlashLP expects uint256)
        const poolIdBigInt = BigInt(positionId)

        try {
            // Call writeContract - this will trigger the wallet popup
            writeContract({
                address: addresses.FlashLP as `0x${string}`,
                abi: ABIS.FlashLP,
                functionName: 'rentPool',
                args: [
                    poolIdBigInt,
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
