# Flash LP Smart Contracts

Production-ready Solidity contracts for Flash LP - a decentralized marketplace for renting Uniswap v4 LP positions with Yellow Network state channels.

## 📋 Contracts Overview

### Core Contracts

| Contract | Purpose | Lines | Status |
|----------|---------|-------|--------|
| **RentalVault.sol** | NFT custody & position management | 300+ | ✅ Complete |
| **RentalManager.sol** | Rental lifecycle & fee distribution | 400+ | ✅ Complete |
| **YellowChannelManager.sol** | State channel management | 350+ | ✅ Complete |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                  │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐
    │   walletConnect/wagmi   │
    └────────────┬────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                   Smart Contracts                        │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ RentalVault  │  │RentalManager │  │YellowChannel │   │
│  │              │  │              │  │   Manager    │   │
│  │  - Deposit   │  │ - Create     │  │ - Open       │   │
│  │  - List      │  │ - End        │  │ - Update     │   │
│  │  - Withdraw  │  │ - Extend     │  │ - Close      │   │
│  │  - Lock      │  │ - Emergency  │  │ - Dispute    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐
    │  Uniswap v4 Position NFT │
    └─────────────────────────┘
```

## 🚀 Quick Start

### 1. Install Foundry

```powershell
# Windows PowerShell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:
```bash
forge --version
cast --version
anvil --version
```

### 2. Install Dependencies

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
forge install foundry-rs/forge-std
```

### 3. Build Contracts

```bash
forge build
```

Expected output:
```
[⠊] Compiling...
[⠒] Compiling 15 files with 0.8.24
[⠢] Solc 0.8.24 finished in 3.42s
Compiler run successful!
```

### 4. Run Tests

```bash
forge test
forge test -vvv  # Verbose
forge coverage   # Coverage report
```

## 📦 Contract Details

### RentalVault.sol

**Purpose**: Secure custody of LP position NFTs

**Key Functions**:
- `depositPosition(address nftContract, uint256 tokenId)` - Deposit NFT
- `listPosition(bytes32 positionId, ...)` - List for rent
- `withdrawPosition(bytes32 positionId)` - Withdraw NFT
- `lockPosition(bytes32 positionId)` - Lock during rental (owner only)

**Security Features**:
- ReentrancyGuard on all state-changing functions
- Ownable for admin functions
- Pausable for emergencies
- Safe ERC721 transfers

### RentalManager.sol

**Purpose**: Manages rental lifecycle and payments

**Key Functions**:
- `createRental(...)` - Start new rental with collateral
- `endRental(bytes32 rentalId)` - Settle and distribute fees
- `extendRental(bytes32 rentalId, uint256 duration)` - Extend active rental
- `emergencyClose(bytes32 rentalId)` - Owner can close with penalty

**Fee Distribution**:
- Platform fee: 2% (configurable, max 5%)
- Owner fee: 98%
- Renter collateral: 120% of rental cost (configurable)

**Duration Limits**:
- Minimum: 1 hour
- Maximum: 7 days

### YellowChannelManager.sol

**Purpose**: Off-chain state channel management

**Key Functions**:
- `openChannel(address participant2, uint256 duration)` - Open channel
- `updateChannel(...)` - Update balances off-chain
- `closeChannel(...)` - Close with signatures
- `startDispute(bytes32 channelId)` - Initiate dispute
- `resolveDispute(...)` - Admin dispute resolution

**Security Features**:
- ECDSA signature verification
- Nonce-based replay protection
- 24-hour dispute timeout
- Balance validation

## 🧪 Testing

### Run All Tests

```bash
forge test
```

### Run Specific Test

```bash
forge test --match-test testDepositPosition
```

### Gas Report

```bash
forge test --gas-report
```

### Coverage

```bash
forge coverage
forge coverage --report lcov
```

## 🌐 Deployment

### Environment Setup

Create `.env` in project root:

```bash
# Private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
BASE_SEPOLIA_RPC=https://sepolia.base.org
OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io

# Etherscan API keys (for verification)
ARBISCAN_API_KEY=your_arbitrum_etherscan_key
BASESCAN_API_KEY=your_base_etherscan_key
OPTIMISM_API_KEY=your_optimism_etherscan_key
```

### Deploy to Testnet

#### Arbitrum Sepolia

```bash
source .env
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --broadcast \
  --verify
```

#### Base Sepolia

```bash
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

#### Optimism Sepolia

```bash
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url $OPTIMISM_SEPOLIA_RPC \
  --broadcast \
  --verify
```

### Verify Contracts Manually

If auto-verification fails:

```bash
forge verify-contract \
  --chain-id 421614 \
  --num-of-optimizations 1000000 \
  --compiler-version v0.8.24 \
  <CONTRACT_ADDRESS> \
  src/RentalVault.sol:RentalVault \
  --etherscan-api-key $ARBISCAN_API_KEY
```

## 📁 Export ABIs for Frontend

After building, ABIs are in `out/`:

```bash
# Copy ABIs to frontend
cp out/RentalVault.sol/RentalVault.json ../src/lib/abis/
cp out/RentalManager.sol/RentalManager.json ../src/lib/abis/
cp out/YellowChannelManager.sol/YellowChannelManager.json ../src/lib/abis/
```

Create `src/lib/contracts.ts`:

```typescript
import RentalVaultABI from './abis/RentalVault.json'
import RentalManagerABI from './abis/RentalManager.json'
import YellowChannelABI from './abis/YellowChannelManager.json'

// From deployment output
export const CONTRACTS = {
  arbitrumSepolia: {
    rentalVault: '0x...',
    rentalManager: '0x...',
    yellowChannel: '0x...'
  },
  baseSepolia: {
    rentalVault: '0x...',
    rentalManager: '0x...',
    yellowChannel: '0x...'
  }
}

export const ABIS = {
  rentalVault: RentalVaultABI.abi,
  rentalManager: RentalManagerABI.abi,
  yellowChannel: YellowChannelABI.abi
}
```

## 🔒 Security Considerations

### Implemented Protections

- ✅ **Reentrancy Protection**: ReentrancyGuard on all external payable functions
- ✅ **Access Control**: Ownable pattern with onlyOwner modifiers
- ✅ **Input Validation**: All parameters validated before use
- ✅ **Integer Overflow**: Solidity 0.8+ built-in protection
- ✅ **Pull Payment Pattern**: Using `.call{value}()` with checks
- ✅ **Pausable**: Emergency pause mechanism
- ✅ **Custom Errors**: Gas-efficient error handling

### Recommended Audits

Before mainnet deployment:
1. Internal security review
2. External audit (OpenZeppelin, Trail of Bits, etc.)
3. Bug bounty program
4. Testnet beta period

## 📊 Gas Optimization

Contracts optimized for:
- **Optimizer runs**: 1,000,000 (for frequently called functions)
- **Custom errors** instead of require strings
- **Packed storage** where possible
- **Minimal storage reads**

Expected gas costs (estimated):
- Deposit Position: ~150k gas
- Create Rental: ~200k gas
- End Rental: ~100k gas
- Extend Rental: ~80k gas

## 🐛 Troubleshooting

### Forge not found

```powershell
# Add to PATH
$env:PATH += ";C:\Users\<YourUsername>\.foundry\bin"
# Or restart terminal
```

### Build fails

```bash
# Clean and rebuild
forge clean
rm -rf node_modules lib cache out
forge install
forge build
```

### Test fails

```bash
# Run with max verbosity
forge test -vvvv

# Run specific test file
forge test --match-path test/RentalVault.t.sol
```

## 📚 Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x/)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Uniswap v4 Docs](https://docs.uniswap.org/contracts/v4/overview)

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit pull request

## ✅ Production Checklist

Before mainnet:
- [ ] All tests passing
- [ ] >95% code coverage
- [ ] External security audit
- [ ] Testnet deployment successful
- [ ] Frontend integration tested
- [ ] Gas optimization review
- [ ] Emergency procedures documented
- [ ] Multi-sig admin setup
- [ ] Bug bounty program active

---

**Built for ETH HackMoney 2026** | Flash LP Team
