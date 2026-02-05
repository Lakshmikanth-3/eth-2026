import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import dynamic from 'next/dynamic'

// Dynamically import Providers with SSR disabled to prevent indexedDB errors
const Providers = dynamic(() => import('./providers').then(mod => ({ default: mod.Providers })), {
    ssr: false
})

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
})

export const metadata: Metadata = {
    title: 'Flash LP - Rent Liquidity by the Second',
    description: 'Flash LP enables protocols to rent Uniswap v4 liquidity positions for exactly the time they need.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    )
}
