'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, base, optimism } from 'wagmi/chains'

export const config = getDefaultConfig({
    appName: 'Flash LP',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [arbitrum, base, optimism],
    ssr: true,
})
