'use client'

import { useState } from 'react'
import { Position } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatLargeCurrency, formatCurrency } from '@/lib/formatting'

interface PositionCardProps {
    position: Position
    onRent: (position: Position) => void
}

export default function PositionCard({ position, onRent }: PositionCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Card hover className="relative overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold mb-1">{position.poolName}</h3>
                        <p className="text-sm text-text-secondary">
                            {position.token0} / {position.token1}
                        </p>
                    </div>
                    <Badge variant={position.chain as any}>
                        {position.chain.toUpperCase()}
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-xs text-text-secondary mb-1">Liquidity</p>
                        <p className="text-lg font-semibold">{formatLargeCurrency(position.liquidity)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary mb-1">APR</p>
                        <p className="text-lg font-semibold text-green-400">{position.apr}%</p>
                    </div>
                </div>

                {/* Pricing */}
                <div className="bg-surface-hover rounded-xl p-4 mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-sm text-text-secondary">Per Hour</span>
                        <span className="text-2xl font-bold">{formatCurrency(position.pricePerHour)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-xs text-text-tertiary">Per Second</span>
                        <span className="text-sm text-text-secondary">{formatCurrency(position.pricePerSecond)}</span>
                    </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center justify-between">
                    <Badge variant={position.available ? 'available' : 'rented'}>
                        {position.available ? 'Available' : 'Rented'}
                    </Badge>
                    <Button
                        size="sm"
                        disabled={!position.available}
                        onClick={() => onRent(position)}
                        className={isHovered && position.available ? 'scale-105' : ''}
                    >
                        {position.available ? 'Rent Now' : 'Unavailable'}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
