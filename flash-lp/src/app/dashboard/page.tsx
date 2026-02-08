'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SwapModal from '@/components/features/SwapModal'
import { Position } from '@/types'
import { ArrowsLeftRight, Circle, Timer } from '@phosphor-icons/react'

export default function DashboardPage() {
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)
    const [selectedRental, setSelectedRental] = useState<any>(null)

    // Mock active rentals for demo
    const activeRentals = [
        {
            id: '1', // Rental ID
            position: {
                id: '1',
                poolName: 'WETH/USDC',
                token0: '0x...',
                token1: '0x...',
                chain: 'base',
                apr: 12.5,
                liquidity: 100000,
                pricePerHour: 5,
                pricePerSecond: 1388888888888n,
                available: false
            },
            startTime: Date.now() - 3600000,
            endTime: Date.now() + 82800000,
            feesEarned: 24.50
        },
        {
            id: '2',
            position: {
                id: '2',
                poolName: 'WETH/USDC',
                token0: '0x...',
                token1: '0x...',
                chain: 'arbitrum',
                apr: 14.2,
                liquidity: 50000,
                pricePerHour: 3,
                pricePerSecond: 833333333333n,
                available: false
            },
            startTime: Date.now() - 7200000,
            endTime: Date.now() + 3600000,
            feesEarned: 12.10
        }
    ]

    const handleSwapClick = (rental: any) => {
        setSelectedRental(rental)
        setIsSwapModalOpen(true)
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-4xl font-black mb-2">My Active Rentals</h1>
                    <p className="text-text-secondary mb-8">Manage your rented liquidity and execute zero-fee swaps.</p>

                    <div className="grid gap-6">
                        {activeRentals.map((rental) => (
                            <div key={rental.id} className="bg-surface border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
                                {/* Left: Info */}
                                <div className="flex items-center gap-6 w-full md:w-auto">
                                    <div className="bg-surface-hover p-4 rounded-xl">
                                        <ArrowsLeftRight size={32} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-xl">{rental.position.poolName}</h3>
                                            <Badge variant={rental.position.chain as any}>{rental.position.chain.toUpperCase()}</Badge>
                                            <Badge variant="success" className="animate-pulse">ACTIVE</Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                                            <div className="flex items-center gap-1">
                                                <Timer size={16} />
                                                <span>Ends in 23h 15m</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-emerald-500 font-bold">
                                                <Circle size={8} weight="fill" />
                                                <span>Fees Earned: ${rental.feesEarned}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button
                                        variant="secondary"
                                        className="flex-1 md:flex-none"
                                    >
                                        Extend Rental
                                    </Button>
                                    <Button
                                        onClick={() => handleSwapClick(rental)}
                                        className="flex-1 md:flex-none px-8 font-bold"
                                    >
                                        Swap Tokens
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />

            {selectedRental && (
                <SwapModal
                    isOpen={isSwapModalOpen}
                    onClose={() => setIsSwapModalOpen(false)}
                    rentalId={selectedRental.id}
                    position={selectedRental.position}
                />
            )}
        </>
    )
}
