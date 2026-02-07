import { useWatchContractEvent, useChainId } from 'wagmi'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import toast from 'react-hot-toast'
import { formatEther } from 'viem'

export function useSwapNotifications(rentalId?: bigint) {
    const chainId = useChainId()
    const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

    useWatchContractEvent({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        eventName: 'SwapExecuted',
        enabled: !!contractAddress && rentalId !== undefined,
        onLogs(logs) {
            logs.forEach((log: any) => {
                // Check if swap is for our rental
                const swapRentalId = log.args?.rentalId
                if (swapRentalId === rentalId) {
                    const amountOut = log.args?.amountOut as bigint
                    const feeCharged = log.args?.feeCharged as bigint
                    const isCrossChain = log.args?.isCrossChain as boolean

                    const message = `Swap Executed! Amount: ${formatEther(amountOut).substring(0, 6)} ETH${isCrossChain ? ' (Cross-Chain)' : ''} | Fee Earned: +${formatEther(feeCharged).substring(0, 6)} ETH`

                    toast.success(message, {
                        duration: 5000,
                        icon: '💰'
                    })
                }
            })
        }
    })
}

export function useRentalNotifications(address?: `0x${string}`) {
    const chainId = useChainId()
    const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

    // Watch for new rentals
    useWatchContractEvent({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        eventName: 'RentalCreated',
        enabled: !!contractAddress && !!address,
        onLogs(logs) {
            logs.forEach((log: any) => {
                const renter = log.args?.renter
                if (renter === address) {
                    const rentalId = log.args?.rentalId as bigint
                    const duration = log.args?.duration as bigint

                    const message = `Rental Created! Rental ID: #${rentalId.toString()} | Duration: ${Number(duration) / 3600}h`

                    toast.success(message, {
                        duration: 5000,
                        icon: '🎉'
                    })
                }
            })
        }
    })

    // Watch for rental endings
    useWatchContractEvent({
        address: contractAddress as `0x${string}`,
        abi: ABIS.FlashLP,
        eventName: 'RentalEnded',
        enabled: !!contractAddress,
        onLogs(logs) {
            logs.forEach((log: any) => {
                const rentalId = log.args?.rentalId as bigint
                const netProfit = log.args?.netProfit as bigint
                const isProfit = netProfit > 0n

                const message = `Rental Ended | Rental ID: #${rentalId.toString()} | ${isProfit ? 'Profit' : 'Loss'}: ${isProfit ? '+' : ''}${formatEther(netProfit).substring(0, 6)} ETH`

                toast(message, {
                    duration: 7000,
                    icon: isProfit ? '🎊' : '📉'
                })
            })
        }
    })
}
