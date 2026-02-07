'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X, ArrowsLeftRight } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { useFlashLPSwap } from '@/hooks/useFlashLPSwap'
import { Rental } from '@/types'
import { formatUnits } from 'viem'

interface SwapModalProps {
    isOpen: boolean
    onClose: () => void
    rental: Rental & {
        token0Address?: string
        token1Address?: string
        token0Symbol?: string
        token1Symbol?: string
    }
}

export default function SwapModal({ isOpen, onClose, rental }: SwapModalProps) {
    const [amount, setAmount] = useState('')
    const [direction, setDirection] = useState<'0to1' | '1to0'>('0to1')

    // Parse pool name "USDC/ETH" to get symbols if not provided
    const symbols = rental.poolName.split('/')
    const token0Symbol = rental.token0Symbol || symbols[0] || 'Token0'
    const token1Symbol = rental.token1Symbol || symbols[1] || 'Token1'

    const { swap, isPending, isConfirming } = useFlashLPSwap()

    // Mock decimals (18) for simulation if not known
    const decimals = 18

    const handleSwap = () => {
        if (!amount || parseFloat(amount) <= 0) return

        // For simulation, we need actual token addresses. 
        // If they are missing from Rental object (due to API limitation), we might fail.
        // We will assume the parent component allows providing them or we use placeholders if mock.
        if (!rental.token0Address || !rental.token1Address) {
            console.error("Missing token addresses for swap")
            // Fallback for mock/demo if addresses are missing?
            // Real contract needs real addresses matching the pool.
            return
        }

        const tokenIn = direction === '0to1' ? rental.token0Address : rental.token1Address

        // Use chainId 421614 (Arbitrum Sepolia) or 84532 (Base Sepolia) based on rental.chain
        const chainId = rental.chain === 'base' ? 84532 : 421614

        swap(rental.id, tokenIn, amount, decimals, chainId)
        // Note: onClose should ideally happen after success, handled by parent or effect
    }

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-sm w-full bg-surface border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-bold">Generate Volume</Dialog.Title>
                        <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-text-secondary mb-4">
                            Simulate a swap to generate fees for your rental.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-surface-hover rounded-xl p-4 border border-gray-700">
                                <label className="text-xs text-text-secondary mb-1 block">From</label>
                                <div className="flex justify-between items-center">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="bg-transparent text-2xl font-bold outline-none w-full mr-2"
                                    />
                                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                                        {direction === '0to1' ? token0Symbol : token1Symbol}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => setDirection(d => d === '0to1' ? '1to0' : '0to1')}
                                    className="bg-surface border border-border p-2 rounded-full hover:bg-surface-hover transition-colors"
                                >
                                    <ArrowsLeftRight size={20} className="text-text-secondary" />
                                </button>
                            </div>

                            <div className="bg-surface-hover rounded-xl p-4 border border-gray-700 opacity-75">
                                <label className="text-xs text-text-secondary mb-1 block">To (Estimated)</label>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-gray-400">
                                        {amount || '0.0'}
                                    </span>
                                    <span className="bg-gray-700/50 text-gray-400 px-3 py-1 rounded-lg text-sm font-bold">
                                        {direction === '0to1' ? token1Symbol : token0Symbol}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSwap}
                            disabled={!amount || parseFloat(amount) <= 0 || isPending || isConfirming}
                            className="flex-1"
                        >
                            {isPending || isConfirming ? 'Swapping...' : 'Execute Swap'}
                        </Button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}
