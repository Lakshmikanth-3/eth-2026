'use client'

import { useState } from 'react'
import { Position } from '@/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/formatting'
import { calculateRentalCost, calculateCollateral } from '@/lib/utils'
import { Clock, CurrencyDollar, ShieldCheck } from '@phosphor-icons/react'

interface RentModalProps {
    position: Position | null
    isOpen: boolean
    isProcessing?: boolean
    onClose: () => void
    onConfirm: (positionId: string, duration: number) => void
}

export default function RentModal({ position, isOpen, isProcessing = false, onClose, onConfirm }: RentModalProps) {
    const [duration, setDuration] = useState('24') // hours

    if (!position) return null

    const durationSeconds = parseInt(duration || '0') * 3600
    const rentalCost = calculateRentalCost(position.pricePerSecond, durationSeconds)
    const collateral = calculateCollateral(rentalCost)
    const totalRequired = rentalCost + collateral

    const handleConfirm = () => {
        onConfirm(position.id, durationSeconds)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rent LP Position">
            {/* Position Info */}
            <div className="bg-surface-hover rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{position.poolName}</h4>
                    <Badge variant={position.chain as any}>{position.chain.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-text-secondary">
                    {position.token0} / {position.token1} • APR: {position.apr}%
                </p>
            </div>

            {/* Duration Input */}
            <div className="mb-6">
                <Input
                    label="Rental Duration (hours)"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="24"
                    min="1"
                />
                <p className="mt-2 text-xs text-text-tertiary">
                    Minimum: 1 hour • Flexible hour-by-hour rental
                </p>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div className="flex items-center gap-3">
                        <Clock size={24} className="text-primary" />
                        <div>
                            <p className="text-sm text-text-secondary">Rental Cost</p>
                            <p className="font-medium">{duration || 0} hours</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(rentalCost)}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={24} className="text-blue-400" />
                        <div>
                            <p className="text-sm text-text-secondary">Collateral (120%)</p>
                            <p className="text-xs text-text-tertiary">Refundable</p>
                        </div>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{formatCurrency(collateral)}</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/30">
                    <div className="flex items-center gap-3">
                        <CurrencyDollar size={24} className="text-primary" weight="fill" />
                        <div>
                            <p className="text-sm font-medium">Total Required</p>
                            <p className="text-xs text-text-tertiary">Locked until rental ends</p>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalRequired)}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isProcessing}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    className="flex-1"
                    isLoading={isProcessing}
                    disabled={!duration || parseInt(duration) < 1 || isProcessing}
                >
                    {isProcessing ? 'Processing...' : 'Confirm Rental'}
                </Button>
            </div>

            <p className="mt-4 text-xs text-center text-text-tertiary">
                Transaction will be processed via Yellow Network state channels
            </p>
        </Modal>
    )
}
