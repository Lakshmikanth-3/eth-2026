import { useState } from 'react'
import toast from 'react-hot-toast'

export function useEndRental() {
    const [isEnding, setIsEnding] = useState(false)

    const endRental = async (channelId: string, rentalId: string) => {
        setIsEnding(true)
        const toastId = toast.loading('Settling with Yellow Network...')

        try {
            // 1. Call API to close channel
            const response = await fetch('/api/yellow/close-channel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId,
                    finalBalance: '1000' // Mock accrued fee for MVP
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to settle channel')
            }

            console.log('Channel settled:', data.txHash)
            toast.success('Rental ended & Channel settled!', { id: toastId })

            // In a real app, we would also call the smart contract to unlock the NFT
            // await endRentalOnChain(rentalId)

            return data.txHash
        } catch (error: any) {
            console.error('Failed to end rental:', error)
            toast.error(error.message || 'Failed to end rental', { id: toastId })
        } finally {
            setIsEnding(false)
        }
    }

    return {
        endRental,
        isEnding
    }
}
