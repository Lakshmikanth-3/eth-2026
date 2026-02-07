'use client'

import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { useRentals } from '@/hooks/useRentals'
import { formatCurrency, formatDuration } from '@/lib/formatting'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Wallet } from '@phosphor-icons/react'

export default function AnalyticsPage() {
    const { address, isConnected } = useAccount()
    const { data: rentals, isLoading } = useRentals()

    const [chartData, setChartData] = useState<any[]>([])

    // Calculate total earnings over time
    useEffect(() => {
        if (!rentals || rentals.length === 0) return

        const data = []
        const now = Date.now()

        // Generate hourly data points for last 24 hours
        for (let i = 24; i >= 0; i--) {
            const timestamp = now - (i * 3600000)

            let totalEarnings = 0

            rentals.forEach(rental => {
                if (rental.startTime <= timestamp && timestamp <= rental.endTime) {
                    const elapsed = (timestamp - rental.startTime) / 1000
                    totalEarnings += elapsed * rental.pricePerSecond
                }
            })

            data.push({
                time: new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                earnings: totalEarnings
            })
        }

        setChartData(data)
    }, [rentals])

    // Calculate metrics
    const totalEarnings = rentals?.reduce((sum, r) => {
        const elapsed = (Math.min(Date.now(), r.endTime) - r.startTime) / 1000
        return sum + (elapsed * r.pricePerSecond)
    }, 0) || 0

    const activeCount = rentals?.filter(r => r.isActive).length || 0

    const totalDuration = rentals?.reduce((sum, r) => sum + r.totalDuration, 0) || 0

    const avgPricePerHour = rentals && rentals.length > 0
        ? rentals.reduce((sum, r) => sum + r.pricePerSecond, 0) / rentals.length * 3600
        : 0

    if (!isConnected) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-surface flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Wallet size={40} weight="fill" className="text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Connect Wallet</h2>
                        <p className="text-text-secondary mb-8">
                            Please connect your wallet to view analytics
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
            <div className="min-h-screen bg-surface py-12">
                <div className="max-w-7xl mx-auto px-6">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-black text-text-primary mb-2">
                            Analytics Dashboard
                        </h1>
                        <p className="text-text-secondary">
                            Track your rental performance and earnings
                        </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

                        {/* Total Earnings */}
                        <div className="bg-white rounded-2xl shadow-lg border border-border p-6">
                            <div className="text-text-muted text-sm mb-1">Total Earnings</div>
                            <div className="text-3xl font-black text-text-primary">
                                {formatCurrency(totalEarnings)}
                            </div>
                            <div className="text-success text-sm mt-2">
                                All-time earnings
                            </div>
                        </div>

                        {/* Active Rentals */}
                        <div className="bg-white rounded-2xl shadow-lg border border-border p-6">
                            <div className="text-text-muted text-sm mb-1">Active Rentals</div>
                            <div className="text-3xl font-black text-text-primary">
                                {activeCount}
                            </div>
                            <div className="text-text-secondary text-sm mt-2">
                                Currently generating fees
                            </div>
                        </div>

                        {/* Total Duration */}
                        <div className="bg-white rounded-2xl shadow-lg border border-border p-6">
                            <div className="text-text-muted text-sm mb-1">Total Duration</div>
                            <div className="text-3xl font-black text-text-primary">
                                {formatDuration(totalDuration)}
                            </div>
                            <div className="text-text-secondary text-sm mt-2">
                                Cumulative rental time
                            </div>
                        </div>

                        {/* Avg Price */}
                        <div className="bg-white rounded-2xl shadow-lg border border-border p-6">
                            <div className="text-text-muted text-sm mb-1">Avg Price/Hour</div>
                            <div className="text-3xl font-black text-text-primary">
                                {formatCurrency(avgPricePerHour)}
                            </div>
                            <div className="text-text-secondary text-sm mt-2">
                                Average rental rate
                            </div>
                        </div>
                    </div>

                    {/* Earnings Chart */}
                    <div className="bg-white rounded-2xl shadow-lg border border-border p-6 mb-8">
                        <h2 className="text-xl font-bold text-text-primary mb-4">
                            Earnings Over Time (24h)
                        </h2>

                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="earnings"
                                        stroke="#FC74FE"
                                        strokeWidth={2}
                                        name="Total Earnings"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-text-muted">
                                No rental data available yet
                            </div>
                        )}
                    </div>

                    {/* Rental Breakdown */}
                    <div className="bg-white rounded-2xl shadow-lg border border-border p-6">
                        <h2 className="text-xl font-bold text-text-primary mb-4">
                            Rental Breakdown
                        </h2>

                        {isLoading ? (
                            <div className="text-center py-8 text-text-muted">
                                Loading rentals...
                            </div>
                        ) : rentals && rentals.length > 0 ? (
                            <div className="space-y-4">
                                {rentals.map((rental) => {
                                    const elapsed = (Math.min(Date.now(), rental.endTime) - rental.startTime) / 1000
                                    const earnings = elapsed * rental.pricePerSecond
                                    const progress = ((Date.now() - rental.startTime) / (rental.endTime - rental.startTime)) * 100

                                    return (
                                        <div key={rental.id} className="border border-border rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-bold text-text-primary">
                                                        {rental.poolName}
                                                    </div>
                                                    <div className="text-sm text-text-muted">
                                                        Rental #{rental.id} • {rental.chain.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-success">
                                                        {formatCurrency(earnings)}
                                                    </div>
                                                    <div className="text-sm text-text-muted">
                                                        earned
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <div className="w-full bg-surface rounded-full h-2">
                                                    <div
                                                        className="bg-primary h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-xs text-text-muted">
                                                <span>
                                                    Started: {new Date(rental.startTime).toLocaleString()}
                                                </span>
                                                <span>
                                                    {rental.isActive ? 'Ends' : 'Ended'}: {new Date(rental.endTime).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-muted">
                                No rentals found. Start by renting a position!
                            </div>
                        )}
                    </div>

                </div>
            </div>
            <Footer />
        </>
    )
}
