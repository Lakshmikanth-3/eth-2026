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
import { TemporalCurveChart } from './tlvm/TemporalCurveChart'
import { PredictiveCommitmentForm } from './tlvm/PredictiveCommitmentForm'
import { VirtualLiquidityIndicator } from './tlvm/VirtualLiquidityIndicator'

interface RentModalProps {
    position: Position | null
    isOpen: boolean
    isProcessing?: boolean
    onClose: () => void
    onConfirm: (positionId: string, duration: number) => void
}

export default function RentModal({ position, isOpen, isProcessing = false, onClose, onConfirm }: RentModalProps) {
    const [duration, setDuration] = useState('24') // hours
    const [hasCommitment, setHasCommitment] = useState(false)
    const [showVirtualIndicator, setShowVirtualIndicator] = useState(false)

    if (!position) return null

    const durationSeconds = parseInt(duration || '0') * 3600
    const baseRentalCost = calculateRentalCost(position.pricePerSecond, durationSeconds)

    // TLVM Discount logic (simulated for UI)
    const discountFactor = hasCommitment ? 0.85 : 1.0 // 15% discount for commitment
    const rentalCost = baseRentalCost * discountFactor

    const collateral = calculateCollateral(rentalCost)
    const totalRequired = rentalCost + collateral

    const handleConfirm = () => {
        setShowVirtualIndicator(true)
        setTimeout(() => {
            onConfirm(position.id, durationSeconds)
        }, 3000) // Delay to show the virtual liquidity activation
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rent LP Position (TLVM Powered)" maxWidth="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Config & TLVM Features */}
                <div className="space-y-6">
                    {/* Position Info */}
                    <div className="bg-surface-hover rounded-2xl p-6 border border-border">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-black text-xl">{position.poolName}</h4>
                            <Badge variant={position.chain as any}>{position.chain.toUpperCase()}</Badge>
                        </div>
                        <p className="text-sm text-text-secondary font-medium">
                            {position.token0} / {position.token1} • APR: <span className="text-primary font-bold">{position.apr}%</span>
                        </p>
                    </div>

                    {/* Duration Input */}
                    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                        <Input
                            label="Rental Duration (hours)"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="24"
                            min="1"
                            className="text-lg font-bold"
                        />
                        <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                            <Clock size={14} />
                            <span>Minimum: 1 hour • Dynamic pricing applied</span>
                        </div>
                    </div>

                    {/* TLVM Predictive Commitment */}
                    <PredictiveCommitmentForm
                        positionId={position.id}
                        duration={durationSeconds}
                        onCommitmentChange={(data) => setHasCommitment(!!data)}
                    />

                    {/* Virtual Liquidity Indicator (Appears when processing) */}
                    {(isProcessing || showVirtualIndicator) && (
                        <div className="animate-in fade-in zoom-in duration-500">
                            <VirtualLiquidityIndicator
                                rentalId="pending"
                                isVirtual={true}
                                latencyBound={20}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column: Pricing & Curve */}
                <div className="space-y-6">
                    {/* Temporal Curve Visualization */}
                    <TemporalCurveChart
                        positionId={position.id}
                        duration={durationSeconds}
                        liquidity={position.liquidity}
                    />

                    {/* Cost Breakdown */}
                    <div className="bg-surface-hover rounded-2xl p-6 border border-border space-y-4">
                        <h5 className="font-bold text-sm uppercase tracking-widest text-text-secondary mb-2">Cost Breakdown</h5>

                        <div className="flex items-center justify-between">
                            <p className="text-sm text-text-secondary">Base Rental Rate</p>
                            <p className="font-bold text-lg">{formatCurrency(baseRentalCost)}</p>
                        </div>

                        {hasCommitment && (
                            <div className="flex items-center justify-between text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg">
                                <p className="text-xs uppercase">Predictive Discount (15%)</p>
                                <p>-{formatCurrency(baseRentalCost * 0.15)}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-500">
                                <ShieldCheck size={20} weight="fill" />
                                <p className="text-sm">Safety Collateral (120%)</p>
                            </div>
                            <p className="font-bold text-lg text-blue-500">{formatCurrency(collateral)}</p>
                        </div>

                        <div className="pt-4 border-t border-border mt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-black">Total Due</p>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-primary">{formatCurrency(totalRequired)}</p>
                                    <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-tighter">Includes Refundable Deposit</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1 py-4 font-bold"
                            disabled={isProcessing || showVirtualIndicator}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            className="flex-1 py-4 font-black text-lg shadow-lg shadow-primary/20"
                            isLoading={isProcessing || showVirtualIndicator}
                            disabled={!duration || parseInt(duration) < 1 || isProcessing || showVirtualIndicator}
                        >
                            Confirm Rental
                        </Button>
                    </div>

                    <p className="text-[10px] text-center text-text-tertiary font-bold uppercase tracking-widest leading-relaxed">
                        SECURED BY TLVM PROTOCOL • EXECUTED VIA YELLOW NETWORK
                    </p>
                </div>
            </div>
        </Modal>
    )
}
