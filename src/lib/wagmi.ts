import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrumSepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'

// Private cached config instance
let _config: ReturnType<typeof getDefaultConfig> | null = null

// Customized chain with gas buffer
const arbitrumSepoliaWithBuffer = {
    ...arbitrumSepolia,
    fees: {
        ...arbitrumSepolia.fees,
        baseFeeMultiplier: 1.5, // 50% buffer for base fee to prevent "max fee per gas less than block base fee" errors
        defaultPriorityFee: BigInt(2000000000), // 2 Gwei priority fee
    }
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
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
            chains: [arbitrumSepoliaWithBuffer, baseSepolia, optimismSepolia],
            ssr: true,
        })
    }

    return _config
}
