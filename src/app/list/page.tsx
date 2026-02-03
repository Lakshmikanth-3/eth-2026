'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wallet, Plus } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

export default function ListPage() {
    const { isConnected } = useAccount()
    const [formData, setFormData] = useState({
        poolName: '',
        token0: '',
        token1: '',
        liquidity: '',
        pricePerHour: '',
        chain: 'arbitrum' as 'arbitrum' | 'base' | 'optimism'
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        // Simulate submission
        await new Promise(resolve => setTimeout(resolve, 2000))

        toast.success('Position listed successfully!')
        setIsSubmitting(false)

        // Reset form
        setFormData({
            poolName: '',
            token0: '',
            token1: '',
            liquidity: '',
            pricePerHour: '',
            chain: 'arbitrum'
        })
    }

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
                            Connect your wallet to list your LP positions for rent
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
                    <div className="max-w-3xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl md:text-5xl font-black mb-4">
                                List Your Position
                            </h1>
                            <p className="text-lg text-text-secondary">
                                Earn passive income by renting out your idle Uniswap v4 LP positions
                            </p>
                        </div>

                        {/* Form Card */}
                        <Card>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6">
                                    {/* Pool Info */}
                                    <div>
                                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                            <Plus size={24} className="text-primary" />
                                            Position Details
                                        </h3>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Input
                                                label="Pool Name"
                                                placeholder="USDC/ETH"
                                                value={formData.poolName}
                                                onChange={(e) => setFormData({ ...formData, poolName: e.target.value })}
                                                required
                                            />

                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                                    Chain
                                                </label>
                                                <div className="flex gap-2">
                                                    {(['arbitrum', 'base', 'optimism'] as const).map((chain) => (
                                                        <button
                                                            key={chain}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, chain })}
                                                            className="flex-1"
                                                        >
                                                            <Badge
                                                                variant={chain}
                                                                className={`w-full justify-center cursor-pointer transition-all ${formData.chain === chain
                                                                    ? 'ring-2 ring-primary scale-105'
                                                                    : 'opacity-60 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                {chain.toUpperCase()}
                                                            </Badge>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                                            <Input
                                                label="Token 0"
                                                placeholder="USDC"
                                                value={formData.token0}
                                                onChange={(e) => setFormData({ ...formData, token0: e.target.value })}
                                                required
                                            />

                                            <Input
                                                label="Token 1"
                                                placeholder="ETH"
                                                value={formData.token1}
                                                onChange={(e) => setFormData({ ...formData, token1: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Financial Details */}
                                    <div className="pt-6 border-t border-border">
                                        <h3 className="text-xl font-bold mb-4">Pricing</h3>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Input
                                                label="Total Liquidity (USD)"
                                                type="number"
                                                placeholder="1000000"
                                                value={formData.liquidity}
                                                onChange={(e) => setFormData({ ...formData, liquidity: e.target.value })}
                                                required
                                                min="0"
                                                step="0.01"
                                            />

                                            <Input
                                                label="Price Per Hour (USD)"
                                                type="number"
                                                placeholder="100.00"
                                                value={formData.pricePerHour}
                                                onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>

                                        {formData.pricePerHour && (
                                            <div className="mt-4 p-4 bg-surface-hover rounded-xl">
                                                <p className="text-sm text-text-secondary mb-2">Estimated Earnings</p>
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-2xl font-bold text-primary">
                                                            ${(parseFloat(formData.pricePerHour) * 24).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-text-tertiary">Per Day</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-primary">
                                                            ${(parseFloat(formData.pricePerHour) * 24 * 7).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-text-tertiary">Per Week</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-primary">
                                                            ${(parseFloat(formData.pricePerHour) * 24 * 30).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-text-tertiary">Per Month</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <div className="pt-6 border-t border-border">
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            size="lg"
                                            isLoading={isSubmitting}
                                        >
                                            {isSubmitting ? 'Listing Position...' : 'List Position'}
                                        </Button>
                                        <p className="mt-3 text-xs text-center text-text-tertiary">
                                            By listing, you agree to lock your position for rental periods
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
