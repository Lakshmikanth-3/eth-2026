import { NextResponse } from 'next/server'
import type { Rental } from '@/types'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const address = searchParams.get('address')

        // ✅ Validate Ethereum address format
        if (address && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return NextResponse.json(
                { error: 'Invalid Ethereum address format' },
                { status: 400 }
            )
        }

        // ✅ Calculate timestamps dynamically per request
        const now = Date.now()
        const mockRentals: Rental[] = [
            {
                id: 'rental-1',
                positionId: '1',
                poolName: 'USDC/ETH',
                startTime: now - 3600000, // 1 hour ago
                endTime: now + 18000000,  // 5 hours from now
                totalDuration: 21600,      // 6 hours in seconds
                pricePerSecond: 0.058,
                chain: 'arbitrum',
                isActive: true,
            },
        ]

        // In production, filter by actual user address
        const rentals = address ? mockRentals : mockRentals

        return NextResponse.json(rentals, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Content-Type': 'application/json',
            }
        })
    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        )
    }
}
