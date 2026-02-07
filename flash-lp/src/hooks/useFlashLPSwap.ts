import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useSwitchChain } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS, DEPLOYED_CHAINS } from '@/lib/contracts'
import { parseUnits } from 'viem'
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
        decimals: number,
        chainId: number
    ) => {
        if (!address) {
            toast.error('Please connect your wallet')
            return
        }

        if (!DEPLOYED_CHAINS.includes(chainId as typeof DEPLOYED_CHAINS[number])) {
            toast.error('FlashLP not deployed on this chain')
            return
        }

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

        const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP
        if (!contractAddress) {
            toast.error('FlashLP not deployed on this network')
            return
        }

        try {
            const parsedAmount = parseUnits(amountIn, decimals)

            writeContract({
                address: contractAddress as `0x${string}`,
                abi: ABIS.FlashLP,
                functionName: 'executeSwap',
                args: [
                    BigInt(rentalId),
                    tokenIn as `0x${string}`,
                    parsedAmount,
                    0n // Min output 0 for demo/simulation
                ],
            })
        } catch (error) {
            console.error('Swap failed:', error)
            toast.error('Failed to execute swap')
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
