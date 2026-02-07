'use client'

import { GithubLogo, TwitterLogo, DiscordLogo } from '@phosphor-icons/react'

export default function Footer() {
    return (
        <footer className="border-t border-border bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent mb-4">
                            Flash LP
                        </h3>
                        <p className="text-text-secondary text-sm">
                            Rent Uniswap v4 liquidity positions by the second. Built on Yellow Network state channels.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li><a href="/marketplace" className="hover:text-primary transition-colors">Marketplace</a></li>
                            <li><a href="/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
                            <li><a href="/list" className="hover:text-primary transition-colors">List Position</a></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-text-secondary">
                            <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">API Reference</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Support</a></li>
                        </ul>
                    </div>

                    {/* Community */}
                    <div>
                        <h4 className="font-semibold mb-4">Community</h4>
                        <div className="flex gap-4">
                            <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                                <TwitterLogo size={24} weight="fill" />
                            </a>
                            <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                                <GithubLogo size={24} weight="fill" />
                            </a>
                            <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                                <DiscordLogo size={24} weight="fill" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-border text-center text-sm text-text-secondary">
                    <p>&copy; 2026 Flash LP. Built for ETH HackMoney 2026.</p>
                </div>
            </div>
        </footer>
    )
}
