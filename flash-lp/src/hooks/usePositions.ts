'use client'

import { useQuery } from '@tanstack/react-query'
import { Position } from '@/types'

export function usePositions(chain?: string) {
    return useQuery<Position[]>({
        queryKey: ['positions', chain],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (chain && chain !== 'all') {
                params.append('chain', chain)
            }

            const response = await fetch(`/api/positions/available?${params.toString()}`)
            if (!response.ok) {
                throw new Error('Failed to fetch positions')
            }
            return response.json()
        },
        refetchInterval: 10000, // Refetch every 10 seconds
    })
}
