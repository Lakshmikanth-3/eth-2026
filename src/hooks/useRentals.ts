'use client'

import { useQuery } from '@tanstack/react-query'
import { Rental } from '@/types'
import { useAccount } from 'wagmi'

export function useRentals() {
    const { address } = useAccount()

    return useQuery<Rental[]>({
        queryKey: ['rentals', address],
        queryFn: async () => {
            if (!address) return []

            const params = new URLSearchParams()
            params.append('address', address)

            const response = await fetch(`/api/rentals/active?${params.toString()}`)
            if (!response.ok) {
                throw new Error('Failed to fetch rentals')
            }
            return response.json()
        },
        enabled: !!address,
        refetchInterval: 5000, // Refetch every 5 seconds for live updates
    })
}
