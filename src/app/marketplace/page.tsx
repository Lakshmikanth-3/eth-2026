'use client'

import { useState } from 'react'
import { Position } from '@/types'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import FilterPanel, { FilterState } from '@/components/features/FilterPanel'
import PositionCard from '@/components/features/PositionCard'
import RentModal from '@/components/features/RentModal'
import { usePositions } from '@/hooks/usePositions'
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

    const { data: positions, isLoading, error } = usePositions(filters.chain)

    // Filter and sort positions
    const filteredPositions = positions?.filter((position) => {
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
        toast.success(`Successfully rented position for ${duration / 3600} hours!`)
        setIsRentModalOpen(false)
        setSelectedPosition(null)
    }

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

                            {error && (
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
                onClose={() => setIsRentModalOpen(false)}
                onConfirm={handleConfirmRental}
            />
        </>
    )
}
