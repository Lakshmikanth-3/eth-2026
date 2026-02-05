import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrumSepolia, baseSepolia, optimismSepolia } from 'wagmi/chains'

// Private cached config instance
let _config: ReturnType<typeof getDefaultConfig> | null = null

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
            chains: [arbitrumSepolia, baseSepolia, optimismSepolia],
            ssr: true,
        })
    }

    return _config
}
