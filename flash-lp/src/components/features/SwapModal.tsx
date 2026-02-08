'use client'

import { useState, useEffect } from 'react'
import { Position } from '@/types'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ArrowDown, ArrowsLeftRight, Wallet } from '@phosphor-icons/react'
import { useFlashLPSwap } from '@/hooks/useFlashLPSwap'
import { formatCurrency } from '@/lib/formatting'
import toast from 'react-hot-toast'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'

interface SwapModalProps {
    isOpen: boolean
    onClose: () => void
    rentalId: string
    position: Position
}

export default function SwapModal({ isOpen, onClose, rentalId, position }: SwapModalProps) {
    const [amountIn, setAmountIn] = useState('')
    const [isZeroToOne, setIsZeroToOne] = useState(true)
    const { swap, isPending, isConfirming, isConfirmed, error } = useFlashLPSwap()

    const tokenIn = isZeroToOne ? position.token0 : position.token1
    const tokenOut = isZeroToOne ? position.token1 : position.token0
    const tokenInSymbol = isZeroToOne ? "USDC" : "WETH" // Using symbols for demo, should map from address
    const tokenOutSymbol = isZeroToOne ? "WETH" : "USDC"

    const handleSwap = () => {
        if (!amountIn || parseFloat(amountIn) <= 0) return

        // Get contract address for current chain
        const chainId = position.chain === 'arbitrum' ? 421614 : 84532
        const contractAddress = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]?.FlashLP

        if (!contractAddress) {
            toast.error("Contract not found for this chain")
            return
        }

        swap(
            rentalId,
            tokenIn,
            amountIn,
            isZeroToOne ? 6 : 18, // Decimals: USDC (6), WETH (18) - simplified
            contractAddress
        )
    }

    useEffect(() => {
        if (isConfirming) toast.loading('Swapping...', { id: 'swap-tx' })
        if (isConfirmed) {
            toast.success('Swap successful!', { id: 'swap-tx' })
            onClose()
            setAmountIn('')
        }
        if (error) toast.error(`Swap failed: ${error.message}`, { id: 'swap-tx' })
    }, [isPending, isConfirming, isConfirmed, error])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Swap Tokens">
            <div className="space-y-4">
                {/* From Token */}
                <div className="bg-surface-hover p-4 rounded-xl border border-border">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-text-secondary font-medium">Pay</label>
                        <span className="text-sm text-text-tertiary flex items-center gap-1">
                            <Wallet size={14} /> Balance: --
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Input
                            type="number"
                            placeholder="0.0"
                            value={amountIn}
                            onChange={(e) => setAmountIn(e.target.value)}
                            className="text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 w-full"
                        />
                        <div className="bg-surface px-3 py-1 rounded-lg font-bold shadow-sm border border-border">
                            {tokenInSymbol}
                        </div>
                    </div>
                </div>

                {/* Switcher */}
                <div className="flex justify-center -my-2 relative z-10">
                    <button
                        onClick={() => setIsZeroToOne(!isZeroToOne)}
                        className="bg-surface border border-border p-2 rounded-full shadow-md hover:bg-surface-hover transition-colors"
                    >
                        <ArrowDown size={20} className="text-primary" />
                    </button>
                </div>

                {/* To Token */}
                <div className="bg-surface-hover p-4 rounded-xl border border-border">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-text-secondary font-medium">Receive (Estimated)</label>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-text-secondary w-full">
                            {amountIn ? (parseFloat(amountIn) * (isZeroToOne ? 0.0003 : 3000)).toFixed(4) : "0.0"}
                        </div>
                        <div className="bg-surface px-3 py-1 rounded-lg font-bold shadow-sm border border-border">
                            {tokenOutSymbol}
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-primary/5 text-primary text-xs p-3 rounded-lg flex items-start gap-2">
                    <ArrowsLeftRight size={16} className="mt-0.5 shrink-0" />
                    <p>
                        Swapping directly against your rented liquidity pool.
                        Fees (0.3%) are <strong>earned by you</strong> and added to your position.
                    </p>
                </div>

                {/* Action */}
                <Button
                    className="w-full py-4 text-lg font-bold"
                    onClick={handleSwap}
                    isLoading={isPending || isConfirming}
                    disabled={!amountIn || isPending || isConfirming}
                >
                    {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Swapping...' : 'Swap Now'}
                </Button>
            </div>
        </Modal>
    )
}
