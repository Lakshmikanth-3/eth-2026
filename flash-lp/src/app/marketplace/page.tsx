'use client'

import { useState, useEffect } from 'react'
import { getAddress } from 'viem'
import { useAccount } from 'wagmi'
import { Position } from '@/types'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FilterPanel, { FilterState } from '@/components/features/FilterPanel'
import PositionCard from '@/components/features/PositionCard'
import RentModal from '@/components/features/RentModal'
import { usePositions } from '@/hooks/usePositions'
import { useFlashLPRent } from '@/hooks/useFlashLPRent'
import { DEPLOYED_CHAINS } from '@/lib/contracts'
import { MagnifyingGlass } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

export default function MarketplacePage() {
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        chain: 'all',
        sortBy: 'apr',
        availableOnly: true
    })
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
    const [isRentModalOpen, setIsRentModalOpen] = useState(false)
    const { rent, isPending, isConfirming, isConfirmed, error: rentError } = useFlashLPRent()
    const { address } = useAccount()

    const { data: positions, isLoading, error: positionsError } = usePositions(filters.chain)

    // Filter and sort positions
    const filteredPositions = positions?.filter((position) => {
        // Chain deployment filter - only show chains where FlashLP is deployed
        const positionChainId = position.chain === 'arbitrum' ? 421614 : position.chain === 'base' ? 84532 : 0
        if (!DEPLOYED_CHAINS.includes(positionChainId as typeof DEPLOYED_CHAINS[number])) {
            return false
        }

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            if (
                !position.poolName.toLowerCase().includes(searchLower) &&
                !position.token0.toLowerCase().includes(searchLower) &&
                !position.token1.toLowerCase().includes(searchLower)
            ) {
                return false
            }
        }

        // Available only filter
        if (filters.availableOnly && !position.available) {
            return false
        }

        return true
    }).sort((a, b) => {
        switch (filters.sortBy) {
            case 'apr':
                return (b.apr || 0) - (a.apr || 0)
            case 'price':
                return a.pricePerHour - b.pricePerHour
            case 'liquidity':
                return b.liquidity - a.liquidity
            default:
                return 0
        }
    })

    const handleRent = (position: Position) => {
        setSelectedPosition(position)
        setIsRentModalOpen(true)
    }

    const handleConfirmRental = (positionId: string, duration: number) => {
        if (!selectedPosition) return

        // Safety check: prevent renting demo positions
        console.log('Attempting to rent position:', positionId)
        if (positionId.toString().trim().startsWith('demo-')) {
            toast.error('Demo position detected. Please hard-refresh your browser (Ctrl+Shift+R) to see real pools!')
            setIsRentModalOpen(false)
            return
        }

        // Convert position ID to pool ID (bigint)
        const poolId = BigInt(positionId)

        //Get chain ID from position
        const chainId = selectedPosition.chain === 'arbitrum' ? 421614 : 84532

        // Calculate price per second from position data
        const pricePerSecond = BigInt(Math.floor(selectedPosition.pricePerSecond * 1e18))

        rent(poolId, duration, pricePerSecond, chainId)
    }

    // Handle transaction states with toast feedback
    useEffect(() => {
        if (isPending) {
            toast.loading('Confirm transaction in your wallet...', { id: 'rental-tx' })
        }

        if (isConfirming) {
            toast.loading('Transaction confirming...', { id: 'rental-tx' })
        }

        if (isConfirmed) {
            toast.success('Rental successful!', { id: 'rental-tx' })
            setIsRentModalOpen(false)
            setSelectedPosition(null)
        }
    }, [isPending, isConfirming, isConfirmed])

    // Handle errors
    useEffect(() => {
        if (rentError) {
            toast.error(`Transaction failed: ${rentError.message}`, { id: 'rental-tx' })
        }
    }, [rentError])


    return (
        <>
            <Header />
            <main className="min-h-screen bg-background">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            Liquidity Marketplace
                        </h1>
                        <p className="text-lg text-text-secondary">
                            Browse and rent available Uniswap v4 LP positions across multiple chains
                        </p>
                    </div>

                    {/* Layout */}
                    <div className="grid lg:grid-cols-4 gap-8">
                        {/* Filters Sidebar */}
                        <div className="lg:col-span-1">
                            <FilterPanel onFilterChange={setFilters} />
                        </div>

                        {/* Positions Grid */}
                        <div className="lg:col-span-3">
                            {isLoading && (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                </div>
                            )}


                            {positionsError && (
                                <div className="text-center py-20">
                                    <p className="text-error mb-4">Failed to load positions</p>
                                    <p className="text-text-secondary">Please try again later</p>
                                </div>
                            )}


                            {filteredPositions && filteredPositions.length === 0 && (
                                <div className="text-center py-20">
                                    <MagnifyingGlass size={64} className="mx-auto mb-4 text-text-tertiary" />
                                    <p className="text-xl font-semibold mb-2">No positions found</p>
                                    <p className="text-text-secondary">Try adjusting your filters</p>
                                </div>
                            )}

                            {filteredPositions && filteredPositions.length > 0 && (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <p className="text-text-secondary">
                                            Showing {filteredPositions.length} position{filteredPositions.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {filteredPositions.map((position) => (
                                            <PositionCard
                                                key={position.id}
                                                position={position}
                                                onRent={handleRent}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            <RentModal
                position={selectedPosition}
                isOpen={isRentModalOpen}
                isProcessing={isPending || isConfirming}
                onClose={() => setIsRentModalOpen(false)}
                onConfirm={handleConfirmRental}
            />
        </>
    )
}
