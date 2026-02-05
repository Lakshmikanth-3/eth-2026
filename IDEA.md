# Flash LP: Per-Second Liquidity Rental Marketplace

## 🎯 Executive Summary

Flash LP is a revolutionary liquidity rental marketplace that allows Uniswap v4 liquidity providers to rent out their LP positions by the second using Yellow Network's state channels. This solves the massive capital inefficiency problem in DeFi where protocols pay for 30 days of liquidity when they only need it for 4 hours.

**The Problem:**
- New DEX launches need deep liquidity for 48 hours but pay for 30 days
- Liquidity mining costs $50k+ for what should cost $1-2k
- LPs have idle capital earning minimal fees
- Traditional billing can't handle per-second granularity due to gas costs

**The Solution:**
- Rent Uniswap v4 LP positions by the second
- Cross-chain liquidity sourcing via LI.FI
- Zero-gas micropayments via Yellow state channels
- Smart contract enforcement via custom Uniswap v4 hooks

## 🏆 Competition Alignment

### Primary Tracks
1. **Yellow Network** ($15k) - Core use case for state channels
2. **Uniswap Foundation** ($10k) - Novel v4 hook implementation
3. **LI.FI** ($6k) - Cross-chain liquidity aggregation

### Why This Wins

**Yellow Network:**
- ✅ Demonstrates EXACTLY why state channels matter
- ✅ Impossible without Yellow (gas would cost more than rental fees)
- ✅ Real-time per-second billing showcase
- ✅ Live demo shows fees accumulating: $0.058... $0.116... $0.174...

**Uniswap Foundation:**
- ✅ Novel v4 hook nobody has built (time-based rental logic)
- ✅ Explores new market structure (liquidity as a rental service)
- ✅ Uses v4's singleton architecture optimally
- ✅ Could apply for "Hook Design Lab" grant post-hackathon

**LI.FI:**
- ✅ Cross-chain liquidity sourcing is the core value prop
- ✅ Demonstrates DeFi composer use case
- ✅ Multi-chain liquidity aggregation

## 💡 How It Works

### User Journey: Protocol Renting Liquidity

**Step 1: Browse Available Liquidity**
```
Protocol sees:
- $1M USDC/ETH on Arbitrum @ $0.058/second ($208/hour)
- $500k USDC/USDT on Base @ $0.029/second ($104/hour)
- $2M ETH/DAI on Optimism @ $0.116/second ($418/hour)
```

**Step 2: Rent Liquidity**
```
Protocol: "I need $1M for 6 hours for my token launch"
Cost: 6 hours × $208/hour = $1,248
Deposits: $1,500 collateral into Yellow channel
```

**Step 3: Liquidity Flows**
```
1. Yellow state channel opens
2. LI.FI bridges LP position from Arbitrum → Base
3. Uniswap v4 hook locks position with timer
4. Fees accrue per-second off-chain
5. Protocol's token launch happens with deep liquidity
6. After 6 hours, position auto-unlocks
7. LI.FI bridges back to Arbitrum
8. Yellow channel settles: $1,248 to LP, $252 refund
```

**Step 4: Results**
```
Traditional approach: $12,500 (30-day liquidity mining)
Flash LP approach: $1,248 (pay only for what you use)
Savings: 90%
```

### User Journey: LP Listing Position

**Step 1: Connect Wallet**
```
LP connects wallet with Uniswap v4 position NFT
App detects: "$1M USDC/ETH position on Arbitrum"
```

**Step 2: Set Rental Terms**
```
LP sets:
- Price: $0.058/second (0.02% per hour)
- Min rental: 1 hour
- Max rental: 48 hours
- Chains: Arbitrum, Base, Optimism
```

**Step 3: List Position**
```
1. Approve RentalHook contract
2. Deposit position into rental vault
3. Position appears in marketplace
4. Start earning rental fees when booked
```

**Step 4: Earn Passive Income**
```
Regular fees: 0.3% on swaps (maybe $50/day)
Rental fees: $208/hour during high-demand periods
Total: 4x-10x more revenue during launches
```

## 🔧 Technical Architecture

### Smart Contracts

**1. RentalLPHook.sol (Uniswap v4 Hook)**
```solidity
// Core functionality:
- beforeAddLiquidity: Verify rental or regular LP
- afterAddLiquidity: Start rental timer
- beforeRemoveLiquidity: Check if rental period ended
- calculateRentalFees: (currentTime - startTime) × pricePerSecond
- forceClose: Allow LP to close if renter defaults
```

**2. RentalVault.sol**
```solidity
// Manages LP positions:
- deposit: LP deposits position for rental
- withdraw: LP withdraws after rental ends
- transferCrossChain: Works with LI.FI for bridging
- lockPosition: Prevents withdrawal during rental
```

**3. YellowChannelManager.sol**
```solidity
// State channel integration:
- openChannel: Renter deposits collateral
- updateBalance: Off-chain balance updates
- settleChannel: Final on-chain settlement
- disputeChannel: Handle disputes
```

### Frontend Architecture

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Wagmi v2 + Viem
- React Query
- Framer Motion (animations)

**Key Pages:**

1. **Home (`/`)**: Hero + stats + how it works
2. **Marketplace (`/marketplace`)**: Browse available LP positions
3. **Rent (`/rent/[positionId]`)**: Rent specific position
4. **List (`/list`)**: List your LP position
5. **Dashboard (`/dashboard`)**: Manage rentals & earnings
6. **Position (`/position/[id]`)**: Position details & analytics

**Design System (Uniswap-inspired):**
```
Colors:
- Primary: #FC74FE (Hot pink)
- Secondary: #FFD9FE (Light pink)
- Background: #FFFFFF
- Surface: #F7F0FF (Very light purple)
- Text: #000000
- Muted: #666666

Typography:
- Headings: 'Inter' (900 weight, tight tracking)
- Body: 'Inter' (400-500 weight)
- Mono: 'Fira Code' (for addresses/numbers)

Icons:
- Phosphor Icons (primary)
- Heroicons (secondary)
- React Icons (social/brands)
```

### State Management

**React Query Queries:**
```typescript
useAvailablePositions() // Fetch marketplace listings
useUserPositions() // User's LP positions
useRentalHistory() // Past rentals
useChannelBalance() // Real-time Yellow channel balance
usePositionAnalytics() // APY, volume, fees
```

**Wagmi Hooks:**
```typescript
useWriteContract() // Contract interactions
useWaitForTransactionReceipt() // Transaction status
useReadContract() // Read contract state
useBalance() // User balances
useAccount() // Connected wallet
```

### Yellow Network Integration

**State Channel Flow:**
```typescript
// 1. Open Channel
await yellowSDK.openChannel({
  counterparty: lpAddress,
  collateral: rentalCost * 1.2, // 120% collateral
  duration: rentalDuration
})

// 2. Real-time Updates (off-chain)
setInterval(() => {
  const elapsed = Date.now() - rentalStart
  const fee = elapsed * pricePerSecond
  yellowSDK.updateBalance(fee)
}, 1000) // Update every second

// 3. Settlement (on-chain)
await yellowSDK.closeChannel({
  finalBalance: totalRentalFee,
  signatures: [renterSig, lpSig]
})
```

### LI.FI Integration

**Cross-chain Position Transfer:**
```typescript
// Get quote for bridging LP position
const quote = await lifi.getQuote({
  fromChain: 'ARB',
  toChain: 'BASE',
  fromToken: LP_POSITION_ADDRESS,
  toToken: LP_POSITION_ADDRESS,
  fromAmount: positionValue
})

// Execute bridge
await lifi.executeRoute(quote)
```

### API Routes

**Next.js API Routes:**
```
/api/positions/available - Get marketplace listings
/api/positions/[id] - Get specific position
/api/rentals/create - Create new rental
/api/rentals/active - Get active rentals
/api/analytics/position/[id] - Position analytics
/api/channels/balance - Get channel balance
/api/channels/settle - Settle channel
```

## 📊 Key Metrics & Analytics

### Dashboard Metrics

**For Renters:**
- Total spent on rentals
- Active rentals (live countdown)
- Cost savings vs traditional liquidity mining
- Volume facilitated
- ROI calculation

**For LPs:**
- Total earnings from rentals
- Utilization rate (% of time rented)
- Average rental price
- Comparison: rental fees vs swap fees
- Best performing pools

### Live Demo Metrics

**Real-time Display:**
```
Rental Active: 00:15:42 elapsed
Fee Accrued: $54.38 ($0.058/sec)
Liquidity: $1,000,000
Volume Through Pool: $245,000
Slippage: 0.12%
```

## 🎨 UI/UX Design

### Design Principles

1. **Clean & Minimal**: Uniswap-inspired white space
2. **Real-time Feedback**: Live counters, animated numbers
3. **Trustworthy**: Clear fees, no hidden costs
4. **Fast**: Instant loading, optimistic updates

### Key Interactions

**Rental Card (Marketplace):**
```
┌────────────────────────────────────┐
│ USDC/ETH Pool                     │
│ $1,000,000 Liquidity              │
│                                    │
│ $0.058/sec • $208/hour            │
│ On Arbitrum                        │
│                                    │
│ ⚡ Available Now                   │
│                                    │
│ [Rent This Position →]            │
└────────────────────────────────────┘
```

**Live Rental Display:**
```
┌────────────────────────────────────┐
│ 🟢 Rental Active                  │
│                                    │
│ Time Elapsed: 00:15:42            │
│ Fee: $54.38                       │
│                                    │
│ ████████░░░░░░░░ 45%              │
│ 2h 45m remaining                   │
│                                    │
│ [Extend Rental] [End Early]       │
└────────────────────────────────────┘
```

## 🚀 MVP Features

### Phase 1 (Hackathon MVP)
- ✅ Connect wallet (RainbowKit)
- ✅ View available LP positions
- ✅ Rent position for X hours
- ✅ Real-time fee counter (mock Yellow integration)
- ✅ Basic Uniswap v4 hook (testnet)
- ✅ Simple position listing
- ✅ Transaction history

### Phase 2 (Post-Hackathon)
- Cross-chain with LI.FI
- Full Yellow Network integration
- Advanced analytics
- Mobile app
- LP position wrapping/unwrapping
- Auction system for high-demand periods

## 🎯 Success Metrics

### Hackathon Demo Goals

1. **Live rental in <30 seconds**
2. **Show real-time fee accrual** (even if simulated)
3. **Execute actual Uniswap v4 hook call** on testnet
4. **Demonstrate cost savings** (side-by-side comparison)
5. **Smooth UX** - no confusing steps

### Post-Hackathon Goals

1. **$10M+ TVL** in rentable liquidity
2. **100+ protocols** using Flash LP
3. **50% cost reduction** for new DEX launches
4. **Integration** with major DeFi protocols

## 🏗️ Development Roadmap

### Week 1 (Hackathon)
- Day 1-2: Smart contracts + hook
- Day 3-4: Frontend + Yellow mock integration
- Day 5-6: LI.FI integration (if time)
- Day 7: Polish + demo video

### Post-Hackathon
- Month 1: Full Yellow + LI.FI integration
- Month 2: Audit + mainnet deployment
- Month 3: Partner integrations
- Month 4: Mobile app

## 💰 Revenue Model

### For Protocol (Post-Hackathon)

1. **Protocol Fee**: 2% of rental fees
2. **Premium Features**: Advanced analytics ($99/mo)
3. **API Access**: For integrators ($499/mo)
4. **Whitelabel**: For other DEXs ($5k setup)

### Example Economics

**$1M liquidity rented for 24 hours:**
```
Rental fee: $208/hr × 24 = $4,992
LP earns: $4,992 × 98% = $4,892
Protocol earns: $4,992 × 2% = $100
```

**At scale (100 rentals/day):**
```
Monthly protocol revenue: $100 × 100 × 30 = $300,000
```

## 🔐 Security Considerations

### Smart Contract Security

1. **Time locks**: Prevent premature withdrawals
2. **Collateral requirements**: 120% of rental cost
3. **Emergency pause**: Admin can pause in emergency
4. **Reentrancy guards**: On all state-changing functions
5. **Access control**: Only authorized addresses

### Yellow Channel Security

1. **Cryptographic signatures**: Both parties must sign
2. **Dispute period**: 24 hours to challenge
3. **Slashing**: Renter loses collateral if defaults
4. **Rate limiting**: Prevent spam attacks

## 📝 Judging Criteria Alignment

### Problem & Solution (25%)
- ✅ **Clear problem**: $50k liquidity mining for 48 hours of need
- ✅ **Obvious solution**: Pay-per-second rental
- ✅ **Real users**: Every new DEX/protocol launch

### Yellow SDK Integration (25%)
- ✅ **Deep integration**: Core to the entire system
- ✅ **Impossible without**: Gas would kill the economics
- ✅ **Showcase strength**: Real-time micropayments

### Business Model (20%)
- ✅ **Clear revenue**: 2% protocol fee
- ✅ **Sustainable**: Recurring revenue from each rental
- ✅ **Scalable**: Works across all chains

### Presentation (15%)
- ✅ **Live demo**: Rent liquidity in real-time
- ✅ **Clear narrative**: Before/after comparison
- ✅ **Visual impact**: Real-time fee counter

### Team Potential (15%)
- ✅ **Post-hackathon plan**: Clear roadmap
- ✅ **Grant applications**: Hook Design Lab, Yellow grants
- ✅ **Commitment**: This solves a real problem we care about

## 🎬 Demo Script

### 3-Minute Demo Flow

**[0:00-0:30] Problem Setup**
"New DEX launches waste $50k on 30-day liquidity mining when they only need deep liquidity for their 48-hour launch window. What if you could rent liquidity by the second?"

**[0:30-1:00] Solution Overview**
"Flash LP is a marketplace where Uniswap v4 LPs rent out positions by the second using Yellow state channels. Zero gas fees, instant settlement, cross-chain via LI.FI."

**[1:00-2:00] Live Demo**
1. Browse marketplace
2. Click "Rent $1M USDC/ETH for 6 hours"
3. Approve transaction
4. Show real-time counter: "$54.38... $54.44... $54.50..."
5. Execute test swap with deep liquidity
6. End rental, show settlement

**[2:00-2:30] Economics**
"Traditional: $12,500 for 30 days. Flash LP: $1,248 for 6 hours. That's 90% savings."

**[2:30-3:00] Why It Matters**
"This unlocks efficient capital allocation in DeFi. LPs earn 4-10x more during high-demand periods. Protocols save 90% on liquidity costs. All powered by Yellow's state channels making per-second billing possible."

## 🔗 Resources

### Documentation
- Uniswap v4 Hooks: https://docs.uniswap.org/contracts/v4/overview
- Yellow Network SDK: https://docs.yellow.org/
- LI.FI API: https://docs.li.fi/

### Example Projects
- Uniswap v4 Template: https://github.com/uniswapfoundation/v4-template
- Yellow Network Apps: https://yellow.com/apps

### Design References
- Uniswap Foundation: https://uniswapfoundation.org/build
- DeFi Design Patterns: https://defi.design

## 📧 Team & Contact

**Team Members:**
- [Your Name] - Full-stack developer
- [Team Member 2] - Smart contract engineer
- [Team Member 3] - Product designer

**Post-Hackathon Contact:**
- Twitter: @FlashLP
- Discord: FlashLP#1234
- Email: team@flashlp.xyz
- GitHub: github.com/flashlp

---

## Appendix: Technical Deep Dives

### A. LP Position Mechanics

When you provide liquidity to Uniswap:
1. Deposit two tokens (e.g., 50% ETH + 50% USDC)
2. Receive LP NFT representing your position
3. Earn fees from every swap (e.g., 0.3%)
4. Can withdraw anytime (unless rented!)

In Flash LP, we wrap this position to make it rentable while preserving the fee-earning rights for the original owner.

### B. State Channel Math

```
Price per second = (Target APR × Total Liquidity) / (365 × 24 × 3600)

Example:
Target APR: 20%
Liquidity: $1,000,000
Price/sec = (0.20 × $1,000,000) / 31,536,000
         = $200,000 / 31,536,000
         = $0.0063/sec
         = $23/hour
         = $547/day
```

### C. Cross-Chain Position Bridging

**Option 1: Native Bridge (Slow)**
```
1. Lock LP position on source chain
2. Bridge proof to destination
3. Mint wrapped LP on destination
4. After rental, reverse process
```

**Option 2: Flash Liquidity (Fast)**
```
1. Flash loan equivalent tokens on destination
2. Add liquidity on destination (temporary)
3. After rental, remove liquidity
4. Repay flash loan with rental fees
```

**Option 3: Synthetic (Instant)**
```
1. Keep LP on source chain
2. Mint synthetic LP on destination (1:1 backed)
3. After rental, burn synthetic
4. Original LP never moves
```

We'll use Option 3 for MVP (fastest to implement).

### D. Hook Implementation Details

```solidity
contract RentalLPHook is BaseHook {
    struct RentalState {
        address originalOwner;
        address currentRenter;
        uint256 startTime;
        uint256 endTime;
        uint256 pricePerSecond;
        uint256 collateralAmount;
        bool isActive;
    }
    
    mapping(bytes32 => RentalState) public rentals;
    
    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // Decode hook data to check if this is a rental
        (bool isRental, bytes memory rentalData) = abi.decode(
            hookData, 
            (bool, bytes)
        );
        
        if (isRental) {
            // Verify Yellow channel is open
            require(
                yellowChannelManager.hasActiveChannel(sender),
                "No active payment channel"
            );
            
            // Store rental state
            bytes32 rentalId = keccak256(abi.encode(
                sender,
                key,
                params,
                block.timestamp
            ));
            
            (
                address owner,
                uint256 duration,
                uint256 price
            ) = abi.decode(rentalData, (address, uint256, uint256));
            
            rentals[rentalId] = RentalState({
                originalOwner: owner,
                currentRenter: sender,
                startTime: block.timestamp,
                endTime: block.timestamp + duration,
                pricePerSecond: price,
                collateralAmount: msg.value,
                isActive: true
            });
        }
        
        return BaseHook.beforeAddLiquidity.selector;
    }
    
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // Find active rental for this position
        bytes32 rentalId = findActiveRental(sender, key);
        
        if (rentalId != bytes32(0)) {
            RentalState memory rental = rentals[rentalId];
            
            // Check if rental period ended
            require(
                block.timestamp >= rental.endTime ||
                sender == rental.originalOwner,
                "Rental still active"
            );
            
            // Calculate final fees
            uint256 duration = block.timestamp - rental.startTime;
            uint256 totalFee = duration * rental.pricePerSecond;
            
            // Settle Yellow channel
            yellowChannelManager.settleChannel(
                rental.currentRenter,
                rental.originalOwner,
                totalFee
            );
            
            // Mark rental as inactive
            rentals[rentalId].isActive = false;
        }
        
        return BaseHook.beforeRemoveLiquidity.selector;
    }
}
```

This hook ensures that:
1. Only rentals with active Yellow channels can add liquidity
2. Positions can't be removed until rental period ends
3. Fees are automatically calculated and settled
4. Original owner always retains control after rental

---

**End of Document**

*This project represents a novel intersection of state channels, AMM design, and cross-chain infrastructure - showcasing the future of capital-efficient DeFi.*
