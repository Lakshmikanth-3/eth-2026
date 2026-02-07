'use client'

import { useEffect, useState } from 'react'
import { Rental } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatTimeRemaining, formatCurrency, formatDuration } from '@/lib/formatting'
import { Clock, CurrencyDollar } from '@phosphor-icons/react'

interface RentalCardProps {
    rental: Rental
}

import Link from 'next/link'
import SwapModal from './SwapModal'
import { ChartLineUp } from '@phosphor-icons/react'

import { useEndRental } from '@/hooks/useEndRental'

export default function RentalCard({ rental }: RentalCardProps) {
    const [timeLeft, setTimeLeft] = useState('')
    const [isSwapOpen, setIsSwapOpen] = useState(false)
    const { endRental, isEnding } = useEndRental()

    useEffect(() => {
        const updateTime = () => {

            setTimeLeft(formatTimeRemaining(rental.endTime))
        }
        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [rental.endTime])

    const totalCost = rental.pricePerSecond * rental.totalDuration

    const handleEndRental = async () => {
        // Use real channel ID if available, otherwise mock
        const channelId = rental.channelId || '0xmock_channel_id'
        await endRental(channelId, rental.id)
    }

    return (
        <>
            <Card>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold mb-1">{rental.poolName}</h3>
                        <p className="text-sm text-text-secondary">Rental ID: {rental.id}</p>
                    </div>
                    <Badge variant={rental.chain as any}>
                        {rental.chain.toUpperCase()}
                    </Badge>
                </div>

                {/* Time Info */}
                <div className="bg-surface-hover rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={20} className="text-primary" />
                        <span className="text-lg font-semibold">{timeLeft}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Duration</span>
                        <span className="font-medium">{formatDuration(rental.totalDuration)}</span>
                    </div>
                </div>

                {/* Cost Info */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CurrencyDollar size={20} className="text-green-400" />
                        <div>
                            <p className="text-xs text-text-secondary">Total Cost</p>
                            <p className="text-lg font-bold text-green-400">{formatCurrency(totalCost)}</p>
                        </div>
                    </div>
                    <Badge variant={rental.isActive ? 'available' : 'rented'}>
                        {rental.isActive ? 'Active' : 'Ended'}
                    </Badge>
                </div>

                {/* Actions */}
                {rental.isActive && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                className="flex-1"
                                onClick={() => setIsSwapOpen(true)}
                            >
                                Swap
                            </Button>
                            <Link href="/analytics" className="flex-1">
                                <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2">
                                    <ChartLineUp size={16} />
                                    Analytics
                                </Button>
                            </Link>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            onClick={handleEndRental}
                            disabled={isEnding}
                        >
                            {isEnding ? 'Settling Channel...' : 'End Rental & Settle'}
                        </Button>
                    </div>
                )}
                {!rental.isActive && (
                    <Link href="/analytics" className="w-full">
                        <Button variant="ghost" size="sm" className="w-full">
                            View History
                        </Button>
                    </Link>
                )}
            </Card>

            <SwapModal
                isOpen={isSwapOpen}
                onClose={() => setIsSwapOpen(false)}
                rental={rental}
            />
        </>
    )
}
