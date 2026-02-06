'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Lightning } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export default function Header() {
    const pathname = usePathname()

    const navigation = [
        { name: 'Home', href: '/' },
        { name: 'Marketplace', href: '/marketplace' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Analytics', href: '/analytics' },
        { name: 'List Position', href: '/list' },
    ]

    return (
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="bg-gradient-to-r from-primary to-primary-600 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <Lightning size={24} weight="fill" className="text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                            Flash LP
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'px-4 py-2 rounded-lg font-medium transition-all',
                                    pathname === item.href
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Connect Wallet */}
                    <div className="flex items-center gap-4">
                        <ConnectButton
                            chainStatus="icon"
                            showBalance={false}
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}
