'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { config } from '@/lib/wagmi'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 1000,           // ✅ Optimized: 5 seconds for fresher data
                gcTime: 60 * 1000,             // ✅ Fixed: gcTime instead of deprecated cacheTime
                refetchOnWindowFocus: false,
                retry: 3,
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            },
        },
    }))

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                    <Toaster position="bottom-right" />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
