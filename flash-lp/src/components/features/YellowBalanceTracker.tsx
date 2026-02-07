'use client'

import { useEffect, useState } from 'react'
import { useYellowChannel } from '@/hooks/useYellowChannel'
import { formatEther } from 'viem'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface YellowBalanceTrackerProps {
    rentalId: number
    renter: string
    owner: string
    initialDeposit: bigint
    pricePerSecond: number
    onSettle?: () => void
}

export default function YellowBalanceTracker({
    rentalId,
    renter,
    owner,
    initialDeposit,
    pricePerSecond,
    onSettle
}: YellowBalanceTrackerProps) {
    const { state, createChannel, updateBalance, settleChannel } = useYellowChannel()
    const [elapsedTime, setElapsedTime] = useState(0)
    const [feesAccrued, setFeesAccrued] = useState(0n)
    const [isSettling, setIsSettling] = useState(false)

    // Initialize Yellow channel on mount
    useEffect(() => {
        if (!state.channelId && state.status === 'idle') {
            createChannel(rentalId, owner, initialDeposit).catch(console.error)
        }
    }, [])

    // Update fees every second
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1)
            const newFees = BigInt(Math.floor(elapsedTime * pricePerSecond * 1e18))
            setFeesAccrued(newFees)

            // Update Yellow channel balance off-chain
            if (state.status === 'active' && newFees > 0n) {
                updateBalance(newFees).catch(console.error)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [elapsedTime, pricePerSecond, state.status])

    const handleSettle = async () => {
        setIsSettling(true)
        try {
            await settleChannel()
            onSettle?.()
        } catch (error) {
            console.error('Settlement failed:', error)
        } finally {
            setIsSettling(false)
        }
    }

    const getStatusBadgeVariant = () => {
        switch (state.status) {
            case 'active': return 'available'
            case 'creating': return 'rented'
            case 'closing': return 'rented'
            case 'closed': return 'base'
            case 'error': return 'arbitrum'
            default: return 'base'
        }
    }

    const getStatusText = () => {
        switch (state.status) {
            case 'creating': return 'Creating Channel...'
            case 'active': return 'Active'
            case 'closing': return 'Settling...'
            case 'closed': return 'Settled'
            case 'error': return 'Error'
            default: return 'Idle'
        }
    }

    return (
        <Card className="relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold mb-1">Yellow Payment Channel</h3>
                    <p className="text-sm text-text-secondary">
                        Real-time off-chain tracking
                    </p>
                </div>
                <Badge variant={getStatusBadgeVariant() as any}>
                    {getStatusText()}
                </Badge>
            </div>

            {/* Channel ID */}
            {state.channelId && (
                <div className="mb-4 p-3 bg-surface-hover rounded-lg">
                    <p className="text-xs text-text-tertiary mb-1">Channel ID</p>
                    <p className="text-xs font-mono text-text-secondary truncate">
                        {state.channelId}
                    </p>
                </div>
            )}

            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-text-secondary mb-1">Your Balance</p>
                    <p className="text-2xl font-bold text-green-400">
                        {formatEther(state.balance)} ETH
                    </p>
                </div>
                <div>
                    <p className="text-xs text-text-secondary mb-1">Owner Earned</p>
                    <p className="text-2xl font-bold">
                        {formatEther(state.counterpartyBalance)} ETH
                    </p>
                </div>
            </div>

            {/* Fees Accrued */}
            <div className="bg-surface-hover rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-secondary">Fees Accrued</span>
                    <span className="text-lg font-semibold text-green-400">
                        {formatEther(feesAccrued)} ETH
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-text-tertiary">Time Elapsed</span>
                    <span className="text-sm text-text-secondary">
                        {Math.floor(elapsedTime / 3600)}h {Math.floor((elapsedTime % 3600) / 60)}m {elapsedTime % 60}s
                    </span>
                </div>
            </div>

            {/* State Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-text-tertiary">State Updates</p>
                    <p className="text-sm font-semibold">{state.nonce}</p>
                </div>
                <div>
                    <p className="text-xs text-text-tertiary">Gas Spent</p>
                    <p className="text-sm font-semibold text-green-400">$0.00</p>
                </div>
            </div>

            {/* Error Display */}
            {state.error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">{state.error}</p>
                </div>
            )}

            {/* Settlement Button */}
            {state.status === 'active' && (
                <Button
                    onClick={handleSettle}
                    disabled={isSettling}
                    className="w-full"
                >
                    {isSettling ? 'Settling...' : 'Settle & End Rental'}
                </Button>
            )}

            {/* Info Banner */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                    💡 Balance updates happen off-chain with zero gas fees. Settlement happens once when you end the rental.
                </p>
            </div>
        </Card>
    )
}
