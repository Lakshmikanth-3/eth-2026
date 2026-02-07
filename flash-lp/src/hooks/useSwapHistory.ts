import { useReadContract, useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import { SwapDetail } from '@/types/flashlp'

export function useSwapHistory(rentalId?: bigint) {
    const chainId = useChainId()
    const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

    const { data, isLoading, error, refetch } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        functionName: 'getSwapHistory',
        args: rentalId !== undefined ? [rentalId] : undefined,
        query: {
            enabled: !!contractAddress && rentalId !== undefined,
            refetchInterval: 5000 // Refresh every 5 seconds
        }
    })

    return {
        swaps: data as SwapDetail[] | undefined,
        isLoading,
        error,
        refetch
    }
}
