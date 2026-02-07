'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import RentalCard from '@/components/features/RentalCard'
import { useRentals } from '@/hooks/useRentals'
import { Wallet, ChartLine } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/formatting'

export default function DashboardPage() {
    const { address, isConnected } = useAccount()
    const { data: rentals, isLoading } = useRentals()

    const activeRentals = rentals?.filter(r => r.isActive) || []
    const totalSpent = rentals?.reduce((sum, r) => sum + (r.pricePerSecond * r.totalDuration), 0) || 0

    if (!isConnected) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Wallet size={40} weight="fill" className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
                        <p className="text-text-secondary mb-8">
                            Connect your wallet to view and manage your active rentals
                        </p>
                        <ConnectButton />
                    </div>
                </main>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-background">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            My Dashboard
                        </h1>
                        <p className="text-lg text-text-secondary">
                            Manage your active rentals and track your spending
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <ChartLine size={24} className="text-primary" />
                                <p className="text-sm text-text-secondary">Active Rentals</p>
                            </div>
                            <p className="text-4xl font-bold">{activeRentals.length}</p>
                        </div>

                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Wallet size={24} className="text-green-400" />
                                <p className="text-sm text-text-secondary">Total Spent</p>
                            </div>
                            <p className="text-4xl font-bold text-green-400">{formatCurrency(totalSpent)}</p>
                        </div>

                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <ChartLine size={24} className="text-blue-400" />
                                <p className="text-sm text-text-secondary">All Time</p>
                            </div>
                            <p className="text-4xl font-bold text-blue-400">{rentals?.length || 0}</p>
                        </div>
                    </div>

                    {/* Rentals List */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6">Active Rentals</h2>

                        {isLoading && (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        )}

                        {!isLoading && activeRentals.length === 0 && (
                            <div className="text-center py-20 bg-surface border border-border rounded-2xl">
                                <Wallet size={64} className="mx-auto mb-4 text-text-tertiary" />
                                <p className="text-xl font-semibold mb-2">No active rentals</p>
                                <p className="text-text-secondary mb-6">Start renting positions to see them here</p>
                                <a href="/marketplace" className="text-primary hover:underline">
                                    Browse Marketplace →
                                </a>
                            </div>
                        )}

                        {!isLoading && activeRentals.length > 0 && (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeRentals.map((rental) => (
                                    <RentalCard key={rental.id} rental={rental} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    {rentals && rentals.length > activeRentals.length && (
                        <div className="mt-12">
                            <h2 className="text-2xl font-bold mb-6">Rental History</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rentals.filter(r => !r.isActive).map((rental) => (
                                    <RentalCard key={rental.id} rental={rental} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    )
}
