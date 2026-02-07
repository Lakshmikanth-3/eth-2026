import { useReadContract, useAccount, useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import { ProfitBreakdown } from '@/types/flashlp'

export function useRentalProfits(rentalId?: bigint) {
    const chainId = useChainId()
    const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

    const { data, isLoading, error, refetch } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        functionName: 'getRentalProfits',
        args: rentalId !== undefined ? [rentalId] : undefined,
        query: {
            enabled: !!contractAddress && rentalId !== undefined,
            refetchInterval: 5000 // Refresh every 5 seconds
        }
    })

    return {
        profits: data as ProfitBreakdown | undefined,
        isLoading,
        error,
        refetch
    }
}

export function useRenterRentals() {
    const { address } = useAccount()
    const chainId = useChainId()
    const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

    const { data, isLoading, error } = useReadContract({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        functionName: 'getRenterRentals',
        args: address ? [address] : undefined,
        query: {
            enabled: !!contractAddress && !!address,
            refetchInterval: 5000 // Refresh every 5 seconds
        }
    })

    return {
        rentalIds: data as bigint[] | undefined,
        isLoading,
        error
    }
}
