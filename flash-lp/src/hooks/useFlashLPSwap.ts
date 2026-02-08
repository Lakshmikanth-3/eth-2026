import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useSwitchChain } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS, DEPLOYED_CHAINS } from '@/lib/contracts'
import { parseUnits } from 'viem'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function useFlashLPSwap() {
    const currentChainId = useChainId()
    const { address } = useAccount()
    const { switchChainAsync } = useSwitchChain()
    const { data: hash, writeContract, isPending, error: writeError } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    })

    const swap = async (
        rentalId: string,
        tokenIn: string,
        amountIn: string,
        tokenInDecimals: number,
        contractAddress: string
    ) => {
        if (!address) {
            toast.error('Please connect your wallet')
            return
        }

        // Parse amount
        const amount = parseUnits(amountIn, tokenInDecimals)

        // TODO: Handle Approvals here (omitted for brevity in this step, assume approved)
        // In a real app, we'd check allowance and trigger approve first.

        try {
            console.log("Swapping on contract:", contractAddress)
            writeContract({
                address: contractAddress as `0x${string}`,
                abi: ABIS.FlashLP, // Using Legacy FlashLP ABI for swap for now
                functionName: 'executeSwap',
                args: [
                    BigInt(rentalId),
                    tokenIn as `0x${string}`,
                    amount,
                    0n // MinAmountOut (slippage protection - set to 0 for demo)
                ],
            })
        } catch (error) {
            console.error('Swap failed:', error)
            toast.error('Failed to initiate swap')
        }
    }

    return {
        swap,
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error: writeError
    }
}
