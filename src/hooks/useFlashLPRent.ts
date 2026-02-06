import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useSwitchChain } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS, DEPLOYED_CHAINS } from '@/lib/contracts'
import { parseEther } from 'viem'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function useFlashLPRent() {
    const currentChainId = useChainId()
    const { address } = useAccount()
    const { switchChainAsync } = useSwitchChain()
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    })

    const rent = async (poolId: bigint, duration: number, pricePerSecond: bigint, chainId: number) => {
        if (!address) {
            toast.error('Please connect your wallet')
            return
        }

        // Verify chain is deployed
        if (!DEPLOYED_CHAINS.includes(chainId as typeof DEPLOYED_CHAINS[number])) {
            toast.error('FlashLP not deployed on this chain')
            return
        }

        // Switch chain if necessary
        if (currentChainId !== chainId) {
            try {
                toast.loading('Switching network...')
                await switchChainAsync({ chainId })
                toast.dismiss()
            } catch (error) {
                console.error('Failed to switch chain:', error)
                toast.error('Failed to switch network')
                return
            }
        }

        // Get contract address
        const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP
        if (!contractAddress) {
            toast.error('FlashLP not deployed on this network')
            return
        }

        // Calculate collateral (120%)
        const rentalCost = BigInt(duration) * pricePerSecond
        const collateral = (rentalCost * 12000n) / 10000n

        try {
            writeContract({
                address: contractAddress as `0x${string}`,
                abi: ABIS.FlashLP,
                functionName: 'rentPool',
                args: [poolId, BigInt(duration), pricePerSecond],
                value: collateral,
                gas: undefined // Let wagmi auto-estimate gas
            })
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
