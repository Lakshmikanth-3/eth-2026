'use client'

import { useState, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ProfitCard from '@/components/features/ProfitCard'
import SwapHistoryTable from '@/components/features/SwapHistoryTable'
import { Clock, TrendUp, Swap } from '@phosphor-icons/react'
import { formatEther } from 'viem'

interface RentalData {
    rental: any
    profits: any
    swaps: any[]
    chainId: number
    fetchedAt: string
}

function RentalCard({ rentalId, chainId }: { rentalId: string; chainId: number }) {
    const [data, setData] = useState<RentalData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch rental data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const response = await fetch(`/api/rentals/${rentalId}?chainId=${chainId}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch rental data')
                }

                const result = await response.json()
                setData(result)
                setError(null)
            } catch (err: any) {
                console.error('Error fetching rental:', err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        // Refresh every 5 seconds
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [rentalId, chainId])

    if (isLoading && !data) {
        return (
            <div className="border border-gray-700 rounded-xl p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="border border-red-700 rounded-xl p-6 bg-red-900/20">
                <p className="text-red-400">Error: {error || 'No data'}</p>
            </div>
        )
    }

    const rental = data.rental
    const profits = data.profits
    const swaps = data.swaps

    const isActive = rental.isActive
    const endDate = new Date(Number(BigInt(rental.endTime)) * 1000)

    return (
        <div className="border border-gray-700 rounded-xl p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">Rental #{rentalId}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            {isActive ? 'Active' : 'Ended'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Pool #{rental.poolId}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-purple-400">
                        {formatEther(BigInt(rental.pricePerSecond) * 3600n).substring(0, 6)} ETH/hr
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Swap size={16} />
                        <span>Swaps</span>
                    </div>
                    <p className="text-2xl font-bold">{rental.swapCount}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <TrendUp size={16} />
                        <span>Volume</span>
                    </div>
                    <p className="text-2xl font-bold">
                        {formatEther(BigInt(rental.totalVolume)).substring(0, 6)} ETH
                    </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Clock size={16} />
                        <span>Expires</span>
                    </div>
                    <p className="text-sm font-medium">
                        {isActive ? endDate.toLocaleDateString() : 'Ended'}
                    </p>
                </div>
            </div>

            {/* Profit Analysis */}
            <ProfitCard profits={profits} isLoading={false} />

            {/* Swap History */}
            <SwapHistoryTable swaps={swaps} isLoading={false} rentalId={BigInt(rentalId)} />

            {/* Debug Info */}
            <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
                Last updated: {new Date(data.fetchedAt).toLocaleString()}
            </div>
        </div>
    )
}

export default function AnalyticsPage() {
    const { address } = useAccount()
    const chainId = useChainId()
    const [rentalIds, setRentalIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch rental IDs from API
    useEffect(() => {
        const fetchRentals = async () => {
            if (!address) {
                setIsLoading(false)
                return
            }

            try {
                setIsLoading(true)
                const response = await fetch(`/api/rentals?address=${address}&chainId=${chainId}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch rentals')
                }

                const result = await response.json()
                setRentalIds(result.rentalIds || [])
                setError(null)
            } catch (err: any) {
                console.error('Error fetching rentals:', err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchRentals()

        // Refresh every 10 seconds
        const interval = setInterval(fetchRentals, 10000)
        return () => clearInterval(interval)
    }, [address, chainId])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            <Header />

            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Rental Analytics</h1>
                    <p className="text-gray-400">View detailed analytics for all your rentals</p>
                </div>

                {!address ? (
                    <div className="border border-gray-700 rounded-xl p-12 bg-gray-800/30 text-center">
                        <p className="text-xl text-gray-400">Please connect your wallet</p>
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="text-gray-400 mt-4">Loading your rentals...</p>
                    </div>
                ) : error ? (
                    <div className="border border-red-700 rounded-xl p-12 bg-red-900/20 text-center">
                        <p className="text-xl text-red-400">Error: {error}</p>
                    </div>
                ) : rentalIds.length > 0 ? (
                    <div className="space-y-6">
                        {rentalIds.map((rentalId) => (
                            <RentalCard key={rentalId} rentalId={rentalId} chainId={chainId} />
                        ))}
                    </div>
                ) : (
                    <div className="border border-gray-700 rounded-xl p-12 bg-gray-800/30 text-center">
                        <p className="text-xl text-gray-400">No rentals found</p>
                        <p className="text-gray-500 mt-2">Start renting pools to see analytics here</p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}
