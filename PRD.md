 
**Project:** Flash LP - Per-Second Liquidity Rental Marketplace  
**Version:** 1.0.0  
**Date:** February 2, 2026  
**Platform:** Next.js 14 Web Application

---

## 🎯 Executive Summary

Flash LP is a DeFi marketplace for renting Uniswap v4 LP positions by the second using Yellow Network state channels. Build a modern, performant web app that enables protocols to access liquidity only when needed.

**Target Users:**
1. Protocols needing temporary liquidity (renters)
2. Uniswap v4 LP holders looking to earn premium fees (lenders)

**Key Metrics:**
- Transaction time: < 30 seconds from browse to rent
- Real-time fee updates: < 1 second latency
- Page load: < 2 seconds
- Mobile responsive: 100%

---

## 📚 Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Design System](#2-design-system)
3. [Pages & Components](#3-pages--components)
4. [Smart Contract Integration](#4-smart-contract-integration)
5. [API Routes](#5-api-routes)
6. [State Management](#6-state-management)
7. [Third-Party Integrations](#7-third-party-integrations)
8. [Development Guidelines](#8-development-guidelines)

---

## 1. Tech Stack

### 1.1 Core Dependencies

```json
{
  "name": "flash-lp",
  "version": "1.0.0",
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.3.0",
    
    "wagmi": "^2.5.0",
    "viem": "^2.7.0",
    "@rainbow-me/rainbowkit": "^2.0.0",
    "@tanstack/react-query": "^5.20.0",
    
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    
    "framer-motion": "^11.0.0",
    "react-hot-toast": "^2.4.1",
    "date-fns": "^3.3.0",
    "numeral": "^2.0.6",
    
    "phosphor-react": "^1.4.1",
    "@heroicons/react": "^2.1.0",
    "react-icons": "^5.0.1",
    
    "recharts": "^2.12.0"
  }
}
```

### 1.2 Project Structure

```
flash-lp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Home
│   │   ├── marketplace/page.tsx
│   │   ├── rent/[id]/page.tsx
│   │   ├── list/page.tsx
│   │   ├── dashboard/page.tsx
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── layout/            # Header, Footer
│   │   ├── marketplace/       # Position cards
│   │   ├── rental/            # Rental forms
│   │   └── ui/                # Reusable UI
│   ├── contracts/             # ABIs & addresses
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utils
│   └── types/                 # TypeScript types
└── public/
```

---

## 2. Design System

### 2.1 Colors (Uniswap-Inspired)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FC74FE',  // Hot pink
          600: '#E753E8',
          700: '#C43BC4',
        },
        secondary: {
          DEFAULT: '#FFD9FE',  // Light pink
        },
        background: '#FFFFFF',
        surface: '#F7F0FF',    // Very light purple
        border: '#E9E9E9',
        text: {
          primary: '#000000',
          secondary: '#666666',
          muted: '#999999',
        },
        success: '#00D395',
        error: '#FF5C5C',
      }
    }
  }
}
```

### 2.2 Typography

```typescript
// Use Inter font for everything
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Typography classes:
// .text-display-xl - 72px, 900 weight, tight spacing (hero headers)
// .text-heading-xl - 32px, 700 weight (page titles)
// .text-heading-lg - 24px, 600 weight (section headers)
// .text-body - 16px, 400 weight (body text)
// .text-caption - 12px, 500 weight, uppercase (labels)
```

### 2.3 Component Patterns

**Button Styles:**
```tsx
// Primary
className="bg-primary hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105"

// Secondary
className="bg-surface hover:bg-gray-100 text-text-primary font-semibold px-6 py-3 rounded-xl border border-border"

// Outline
className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-6 py-3 rounded-xl"
```

**Card Styles:**
```tsx
className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
```

### 2.4 Icon Usage

```tsx
// Primary: Phosphor Icons
import { Lightning, Clock, Wallet } from 'phosphor-react'
<Lightning size={24} weight="fill" color="#FC74FE" />

// Secondary: Heroicons
import { ChartBarIcon } from '@heroicons/react/24/outline'
<ChartBarIcon className="w-6 h-6 text-primary" />

// Social: React Icons
import { FaTwitter } from 'react-icons/fa'
<FaTwitter className="w-5 h-5" />
```

---

## 3. Pages & Components

### 3.1 Home Page (`/`)

**Layout:**
```tsx
<div>
  <Hero />
  <Stats />
  <HowItWorks />
  <Comparison />
  <CTA />
</div>
```

**Hero Section:**
```tsx
<section className="min-h-[90vh] flex items-center justify-center relative">
  <div className="container-xl px-6">
    <h1 className="text-display-xl text-center mb-6">
      Rent Liquidity<br />by the Second
    </h1>
    <p className="text-body-lg text-text-secondary text-center max-w-2xl mx-auto mb-12">
      Flash LP enables protocols to rent Uniswap v4 liquidity positions 
      for exactly the time they need. Pay per second, save 90%.
    </p>
    <div className="flex gap-4 justify-center">
      <Link href="/marketplace">
        <button className="bg-primary hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:scale-105 transition-all">
          Browse Liquidity →
        </button>
      </Link>
    </div>
  </div>
</section>
```

**Stats Section:**
```tsx
<section className="py-24 bg-surface">
  <div className="container-xl px-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      <div className="text-center">
        <div className="text-6xl font-black text-primary mb-2">$2.5M</div>
        <div className="text-caption text-text-secondary">Total Liquidity</div>
      </div>
      {/* More stats */}
    </div>
  </div>
</section>
```

### 3.2 Marketplace Page (`/marketplace`)

**Key Components:**
- SearchBar (search by pool name)
- FilterBar (chain, min liquidity, max price)
- PositionCard (displays LP position details)

**PositionCard Component:**
```tsx
interface Position {
  id: string
  poolName: string
  token0: string
  token1: string
  liquidity: string
  pricePerSecond: string
  pricePerHour: string
  chain: 'arbitrum' | 'base' | 'optimism'
  available: boolean
}

export function PositionCard({ position }: { position: Position }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-heading-md">{position.poolName}</h3>
          <div className="text-body-sm text-text-secondary">
            {position.token0} / {position.token1}
          </div>
        </div>
        {position.available && (
          <span className="flex items-center gap-1 text-success text-caption">
            <Lightning size={16} weight="fill" />
            Available
          </span>
        )}
      </div>
      
      {/* Liquidity */}
      <div className="mb-4">
        <div className="text-caption text-text-secondary mb-1">LIQUIDITY</div>
        <div className="text-2xl font-bold font-mono">
          ${numeral(position.liquidity).format('0,0')}
        </div>
      </div>
      
      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-caption text-text-secondary mb-1">PER SECOND</div>
          <div className="text-heading-md font-mono">${position.pricePerSecond}</div>
        </div>
        <div>
          <div className="text-caption text-text-secondary mb-1">PER HOUR</div>
          <div className="text-heading-md font-mono">${position.pricePerHour}</div>
        </div>
      </div>
      
      {/* Chain Badge */}
      <ChainBadge chain={position.chain} />
      
      {/* CTA */}
      <Link href={`/rent/${position.id}`}>
        <button className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-xl mt-6 transition-all">
          Rent Position →
        </button>
      </Link>
    </div>
  )
}
```

### 3.3 Rent Position Page (`/rent/[id]`)

**RentalForm Component:**
```tsx
export function RentalForm({ position }: { position: Position }) {
  const [duration, setDuration] = useState(6) // hours
  const pricePerSecond = parseFloat(position.pricePerSecond)
  const totalCost = pricePerSecond * duration * 3600
  const collateral = totalCost * 1.2

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <h2 className="text-heading-lg mb-6">Rent This Position</h2>
      
      {/* Duration Input */}
      <div className="mb-6">
        <label className="text-caption text-text-secondary mb-2 block">
          RENTAL DURATION (HOURS)
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          min={1}
          max={48}
          className="w-full border border-border rounded-xl px-4 py-3 text-lg font-semibold"
        />
      </div>
      
      {/* Cost Breakdown */}
      <div className="bg-surface rounded-xl p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Duration</span>
          <span className="text-body-sm font-semibold">
            {duration * 3600} seconds
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Price/sec</span>
          <span className="text-body-sm font-mono">${position.pricePerSecond}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-semibold">Total Cost</span>
          <span className="text-heading-md font-mono text-primary">
            ${totalCost.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* Collateral Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="text-body-sm">
          <strong>Collateral Required:</strong> ${collateral.toFixed(2)} (120%)
        </div>
      </div>
      
      {/* Rent Button */}
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal }) => {
          if (!account) {
            return (
              <button
                onClick={openConnectModal}
                className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-4 rounded-xl"
              >
                Connect Wallet
              </button>
            )
          }
          return (
            <button
              onClick={() => handleRent()}
              className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-4 rounded-xl"
            >
              Rent for ${totalCost.toFixed(2)} →
            </button>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}
```

### 3.4 Dashboard Page (`/dashboard`)

**LiveRentalCard Component:**
```tsx
export function LiveRentalCard({ rental }: { rental: ActiveRental }) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentFee, setCurrentFee] = useState(0)
  
  // Update every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - rental.startTime) / 1000)
      setElapsedTime(elapsed)
      setCurrentFee(elapsed * rental.pricePerSecond)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [rental])
  
  const progress = (elapsedTime / rental.totalDuration) * 100
  
  return (
    <div className="bg-white rounded-2xl border-2 border-primary p-6">
      {/* Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
        <span className="text-caption text-success">RENTAL ACTIVE</span>
      </div>
      
      {/* Position Info */}
      <h3 className="text-heading-lg mb-2">{rental.poolName}</h3>
      
      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-xl p-4">
          <div className="text-caption text-text-secondary mb-1">TIME ELAPSED</div>
          <div className="text-2xl font-bold font-mono">
            {formatDuration(elapsedTime)}
          </div>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <div className="text-caption text-text-secondary mb-1">FEE ACCRUED</div>
          <div className="text-2xl font-bold font-mono text-primary">
            ${currentFee.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-body-sm text-text-secondary">Progress</span>
          <span className="text-body-sm font-semibold">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 4. Smart Contract Integration

### 4.1 Contract Addresses

```typescript
// src/contracts/addresses.ts
export const CONTRACT_ADDRESSES = {
  arbitrum: {
    RentalLPHook: '0x...', // Replace with actual deployed address
    RentalVault: '0x...',
    YellowChannelManager: '0x...',
  },
  base: {
    RentalLPHook: '0x...',
    RentalVault: '0x...',
    YellowChannelManager: '0x...',
  },
  optimism: {
    RentalLPHook: '0x...',
    RentalVault: '0x...',
    YellowChannelManager: '0x...',
  },
} as const
```

### 4.2 Contract ABIs

```typescript
// src/contracts/abis/RentalLPHook.json
[
  {
    "type": "function",
    "name": "createRental",
    "inputs": [
      { "name": "positionId", "type": "uint256" },
      { "name": "duration", "type": "uint256" }
    ],
    "outputs": [{ "name": "rentalId", "type": "bytes32" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "endRental",
    "inputs": [{ "name": "rentalId", "type": "bytes32" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
]
```

### 4.3 Wagmi Configuration

```typescript
// src/lib/wagmi.ts
import { http, createConfig } from 'wagmi'
import { arbitrum, base, optimism } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { metaMaskWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets'

const connectors = connectorsForWallets([{
  groupName: 'Recommended',
  wallets: [metaMaskWallet, rainbowWallet],
}], {
  appName: 'Flash LP',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
})

export const config = createConfig({
  chains: [arbitrum, base, optimism],
  connectors,
  transports: {
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
})
```

### 4.4 Contract Interaction Hooks

```typescript
// src/hooks/useRentPosition.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACT_ADDRESSES } from '@/contracts/addresses'
import RentalLPHookABI from '@/contracts/abis/RentalLPHook.json'

export function useRentPosition() {
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })
  
  const rentPosition = async ({
    positionId,
    duration,
    collateral,
    chain,
  }: {
    positionId: string
    duration: number
    collateral: string
    chain: 'arbitrum' | 'base' | 'optimism'
  }) => {
    await writeContract({
      address: CONTRACT_ADDRESSES[chain].RentalLPHook as `0x${string}`,
      abi: RentalLPHookABI,
      functionName: 'createRental',
      args: [BigInt(positionId), BigInt(duration)],
      value: parseEther(collateral),
    })
  }
  
  return { rentPosition, isConfirming, hash }
}
```

---

## 5. API Routes

### 5.1 Get Available Positions

```typescript
// src/app/api/positions/available/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain')
  
  // TODO: Query blockchain for positions
  // For MVP, return mock data:
  const positions = [
    {
      id: '1',
      poolName: 'USDC/ETH',
      token0: 'USDC',
      token1: 'ETH',
      liquidity: '1000000',
      pricePerSecond: '0.058',
      pricePerHour: '208.80',
      chain: 'arbitrum',
      available: true,
    },
    // More positions...
  ]
  
  return NextResponse.json(positions)
}
```

### 5.2 Get Active Rentals

```typescript
// src/app/api/rentals/active/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  
  // TODO: Query blockchain for rentals by address
  const rentals = [
    {
      id: 'rental-1',
      positionId: '1',
      poolName: 'USDC/ETH',
      startTime: Date.now() - 3600000,
      endTime: Date.now() + 18000000,
      totalDuration: 21600,
      pricePerSecond: 0.058,
      chain: 'arbitrum',
    },
  ]
  
  return NextResponse.json(rentals)
}
```

---

## 6. State Management

### 6.1 React Query Hooks

```typescript
// src/hooks/useAvailablePositions.ts
import { useQuery } from '@tanstack/react-query'

export function useAvailablePositions(filters?: { chain?: string }) {
  return useQuery({
    queryKey: ['positions', 'available', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.chain) params.append('chain', filters.chain)
      
      const res = await fetch(`/api/positions/available?${params}`)
      return res.json()
    },
    staleTime: 30000,
    refetchInterval: 60000,
  })
}
```

```typescript
// src/hooks/useActiveRentals.ts
export function useActiveRentals() {
  const { address } = useAccount()
  
  return useQuery({
    queryKey: ['rentals', 'active', address],
    queryFn: async () => {
      const res = await fetch(`/api/rentals/active?address=${address}`)
      return res.json()
    },
    enabled: !!address,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  })
}
```

---

## 7. Third-Party Integrations

### 7.1 Yellow Network (State Channels)

```typescript
// src/lib/yellow.ts
// NOTE: Mock implementation - replace with actual Yellow SDK

export class YellowChannelManager {
  async openChannel(params: {
    counterparty: string
    collateral: bigint
    duration: number
  }) {
    console.log('Opening Yellow channel:', params)
    return { channelId: `channel-${Date.now()}`, status: 'open' }
  }
  
  async updateBalance(channelId: string, newBalance: bigint) {
    console.log('Updating balance:', channelId, newBalance)
  }
  
  async closeChannel(channelId: string, finalBalance: bigint) {
    console.log('Closing channel:', channelId, finalBalance)
    return { txHash: '0x...', settled: true }
  }
}

export const yellowSDK = new YellowChannelManager()
```

### 7.2 LI.FI (Cross-Chain)

```typescript
// src/lib/lifi.ts
import { LiFi } from '@lifi/sdk'

export const lifi = new LiFi({ integrator: 'flash-lp' })

export async function getBridgeQuote(params: {
  fromChain: string
  toChain: string
  fromToken: string
  fromAmount: string
}) {
  return await lifi.getQuote(params)
}
```

---

## 8. Development Guidelines

### 8.1 Code Style

```typescript
// Use TypeScript strictly
interface Props {
  position: Position
  onRent?: (id: string) => void
}

// Name components in PascalCase
export function PositionCard({ position, onRent }: Props) {
  // Hooks first
  const { address } = useAccount()
  const [isHovered, setIsHovered] = useState(false)
  
  // Handlers
  const handleClick = () => {
    onRent?.(position.id)
  }
  
  // Render
  return <div>...</div>
}
```

### 8.2 Naming Conventions

- **Files:** PascalCase for components (`PositionCard.tsx`)
- **Hooks:** camelCase with 'use' prefix (`useRentPosition.ts`)
- **Constants:** UPPER_SNAKE_CASE (`CONTRACT_ADDRESSES`)
- **Functions:** camelCase (`rentPosition`)

### 8.3 Error Handling

```typescript
try {
  await rentPosition(params)
  toast.success('Rental successful!')
} catch (error) {
  console.error('Rental error:', error)
  toast.error(error instanceof Error ? error.message : 'Transaction failed')
}
```

### 8.4 Performance

```typescript
// Use Next.js Image
import Image from 'next/image'
<Image src="/logo.png" alt="Flash LP" width={200} height={50} priority />

// Dynamic imports for heavy components
const ChartComponent = dynamic(() => import('@/components/Chart'), {
  loading: () => <Spinner />,
  ssr: false,
})

// Memoize expensive calculations
const totalCost = useMemo(() => 
  duration * pricePerSecond * 3600, 
  [duration, pricePerSecond]
)
```

---

## 9. Utility Functions

```typescript
// src/lib/formatting.ts
import numeral from 'numeral'
import { formatDistanceToNow } from 'date-fns'

export function formatCurrency(value: number): string {
  return numeral(value).format('$0,0.00')
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
```

```typescript
// src/lib/utils.ts
export function calculateRentalCost(
  pricePerSecond: number,
  durationSeconds: number
): number {
  return pricePerSecond * durationSeconds
}

export function calculateCollateral(rentalCost: number): number {
  return rentalCost * 1.2 // 120%
}
```

---

## 10. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

# Contract Addresses
NEXT_PUBLIC_RENTAL_HOOK_ARBITRUM=0x...
NEXT_PUBLIC_RENTAL_HOOK_BASE=0x...
NEXT_PUBLIC_RENTAL_HOOK_OPTIMISM=0x...
```

---

## 11. Implementation Priorities

### Phase 1: MVP (Week 1)
1. ✅ Setup Next.js + TypeScript + Tailwind
2. ✅ Implement wallet connection (RainbowKit)
3. ✅ Build home page (hero + stats)
4. ✅ Build marketplace (position cards)
5. ✅ Build rent form
6. ✅ Mock contract integration
7. ✅ Real-time fee counter
8. ✅ Dashboard with active rentals

### Phase 2: Integration (Week 2)
1. ⭕ Full smart contract integration
2. ⭕ Yellow Network state channels
3. ⭕ LI.FI cross-chain
4. ⭕ Position listing flow
5. ⭕ Analytics

### Phase 3: Polish (Week 3)
1. ⭕ Mobile optimization
2. ⭕ Performance tuning
3. ⭕ Error handling
4. ⭕ Testing
5. ⭕ Documentation

---

## 12. Success Criteria

**MVP Goals:**
- ✅ User can browse positions
- ✅ User can rent position in < 30 seconds
- ✅ Real-time fee counter updates smoothly
- ✅ Mobile responsive
- ✅ Zero TypeScript errors
- ✅ Professional UI matching Uniswap style

**Technical Requirements:**
- Page load < 2 seconds
- API response < 500ms
- Real-time updates < 1 second latency
- 100% TypeScript coverage
- Accessibility: WCAG 2.1 AA

---

## Final Notes for Code Builders

**Key Implementation Points:**

1. **Start Simple:** Build UI with mock data first, then integrate contracts
2. **Type Everything:** Use TypeScript strictly for all components and functions
3. **Follow Design:** Match the Uniswap-inspired pink theme exactly
4. **Component Isolation:** Each component should work independently
5. **Real-time First:** Use React Query with proper refetch intervals
6. **Error Handling:** Every async operation needs try-catch + user feedback
7. **Performance:** Use Next.js Image, dynamic imports, memoization
8. **Accessibility:** Keyboard navigation + screen reader support
9. **Mobile First:** Design for mobile, enhance for desktop
10. **Keep It Fast:** Every millisecond matters

**When Building:**
- Reference the Uniswap Foundation design (pink theme, clean layout)
- Make it FAST - optimize everything
- Keep it SIMPLE - no over-engineering
- Test on mobile - most users will be mobile-first

**Demo Must Show:**
- Browse → Rent → Live counter in < 30 seconds
- Real-time fee updates every second
- Smooth animations and transitions
- Professional, polished UI

---

**Good luck building! 🚀**

This PRD should give agentic code builders everything they need to create a production-ready Flash LP application.

---

**END OF DOCUMENT**
