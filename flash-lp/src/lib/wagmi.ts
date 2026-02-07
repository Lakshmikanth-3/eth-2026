import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrumSepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'
import type { Chain } from 'viem'

// Private cached config instance
let _config: ReturnType<typeof getDefaultConfig> | null = null

// Custom Arbitrum Sepolia chain with optimized gas estimation
const arbitrumSepoliaCustom: Chain = {
    ...arbitrumSepolia,
    fees: {
        ...arbitrumSepolia.fees,
        // Estimate fees with a 50% buffer on the base fee using 1.5 multiplier
        // this strictly prevents "max fee per gas less than block base fee" errors
        baseFeeMultiplier: 1.5,
    },
}

/**
 * Get wagmi configuration
 * 
 * The config is lazily initialized and cached for reuse.
 * Safe to call during SSR - connectors initialize only on client.
 */
export function getWagmiConfig() {
    // Lazy initialization - create config only once
    if (!_config) {
        _config = getDefaultConfig({
            appName: 'Flash LP',
            // Placeholder UUID for local dev - MetaMask works without a real WalletConnect ID
            // For production, add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to .env
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            chains: [arbitrumSepoliaCustom, baseSepolia, optimismSepolia],
            ssr: true,
        })
    }

    return _config
}
