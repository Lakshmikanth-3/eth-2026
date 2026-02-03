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

export default function RentalCard({ rental }: RentalCardProps) {
    const [timeLeft, setTimeLeft] = useState('')

    useEffect(() => {
        const updateTime = () => {
            setTimeLeft(formatTimeRemaining(rental.endTime))
        }
        updateTime()
        const interval = setInterval(updateTime, 1000)
        return () => clearInterval(interval)
    }, [rental.endTime])

    const totalCost = rental.pricePerSecond * rental.totalDuration

    return (
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
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1">
                        Extend
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                        End Rental
                    </Button>
                </div>
            )}
        </Card>
    )
}
