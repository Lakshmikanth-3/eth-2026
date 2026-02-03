'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { ArrowRight, Lightning, ShieldCheck, Clock, CurrencyDollar } from '@phosphor-icons/react'

export default function Home() {
    return (
        <>
            <Header />
            <main className="min-h-screen">
                {/* Hero Section */}
                <section className="relative overflow-hidden">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background -z-10" />
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl -z-10" />
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -z-10" />

                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                        <div className="max-w-4xl mx-auto text-center">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-8">
                                <Lightning size={20} weight="fill" className="text-primary" />
                                <span className="text-sm font-medium">Powered by Yellow Network State Channels</span>
                            </div>

                            {/* Heading */}
                            <h1 className="text-5xl md:text-7xl font-black mb-6">
                                Rent Liquidity
                                <br />
                                <span className="bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                                    By The Second
                                </span>
                            </h1>

                            <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto">
                                Access Uniswap v4 LP positions instantly. Pay only for what you use. No long-term commitments.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/marketplace">
                                    <Button size="lg" className="group">
                                        Browse Marketplace
                                        <ArrowRight size={20} weight="bold" className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="/list">
                                    <Button variant="secondary" size="lg">
                                        List Your Position
                                    </Button>
                                </Link>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
                                <div>
                                    <p className="text-3xl md:text-4xl font-bold text-primary">$2.4M</p>
                                    <p className="text-sm text-text-secondary mt-1">Total Liquidity</p>
                                </div>
                                <div>
                                    <p className="text-3xl md:text-4xl font-bold text-primary">120+</p>
                                    <p className="text-sm text-text-secondary mt-1">Active Positions</p>
                                </div>
                                <div>
                                    <p className="text-3xl md:text-4xl font-bold text-primary">3</p>
                                    <p className="text-sm text-text-secondary mt-1">Chains</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 md:py-32 bg-surface/50">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black mb-4">
                                Why Choose Flash LP?
                            </h2>
                            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                                Revolutionary liquidity rental marketplace built for DeFi protocols and traders
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {/* Feature 1 */}
                            <div className="bg-surface border border-border rounded-2xl p-8 hover:border-primary transition-all group">
                                <div className="w-14 h-14 bg-gradient-to-r from-primary to-primary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <Clock size={28} weight="fill" className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Pay Per Second</h3>
                                <p className="text-text-secondary">
                                    True flexibility. Rent for hours, days, or weeks. Pay only for the exact duration you need.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-surface border border-border rounded-2xl p-8 hover:border-primary transition-all group">
                                <div className="w-14 h-14 bg-gradient-to-r from-primary to-primary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={28} weight="fill" className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Fully Secured</h3>
                                <p className="text-text-secondary">
                                    120% collateral ensures position safety. Powered by Yellow Network's state channels for instant settlement.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-surface border border-border rounded-2xl p-8 hover:border-primary transition-all group">
                                <div className="w-14 h-14 bg-gradient-to-r from-primary to-primary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <CurrencyDollar size={28} weight="fill" className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Earn Passive Income</h3>
                                <p className="text-text-secondary">
                                    List your idle LP positions and earn rental fees. Set your own prices and terms.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 md:py-32">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-primary/10 to-primary-600/10 border border-primary/30 rounded-3xl p-12">
                            <h2 className="text-3xl md:text-5xl font-black mb-6">
                                Ready to Get Started?
                            </h2>
                            <p className="text-lg text-text-secondary mb-8">
                                Connect your wallet and start renting liquidity in seconds
                            </p>
                            <Link href="/marketplace">
                                <Button size="lg" className="group">
                                    Explore Marketplace
                                    <ArrowRight size={20} weight="bold" className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
