# Flash LP Smart Contracts - Hardhat Setup Guide

**Easy-to-use Hardhat setup** for Flash LP smart contracts - much simpler than Foundry!

## ✅ Why Hardhat?

- **JavaScript/TypeScript Based** - No new language to learn
- **Better Error Messages** - Clear, helpful debugging
- **Rich Plugin Ecosystem** - Everything you need built-in
- **Excellent Documentation** - Easy to get started
- **TypeScript Support** - Full type safety

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `hardhat` - Core framework
- `@nomicfoundation/hardhat-toolbox` - Testing, deployment, verification
- `@openzeppelin/contracts` - Secure contract library
- `dotenv` - Environment variables

### 2. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 3 Solidity files successfully
```

### 3. Run Tests

```bash
npx hardhat test
```

### 4. Deploy Locally (Test)

```bash
# Start local blockchain
npx hardhat node

# In another terminal
npx hardhat run contracts/scripts/deploy.ts --network localhost
```

---

## 📝 Environment Setup

Create `.env` in project root:

```bash
# Private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
BASE_SEPOLIA_RPC=https://sepolia.base.org
OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io

# Etherscan API keys (for verification)
ARBISCAN_API_KEY=your_key
BASESCAN_API_KEY=your_key
OPTIMISM_API_KEY=your_key

# Optional
REPORT_GAS=true
```

**⚠️ NEVER commit `.env` to git!**

---

## 🌐 Deploy to Testnet

### Get Testnet ETH

1. **Arbitrum Sepolia**: https://faucet.quicknode.com/arbitrum/sepolia
2. **Base Sepolia**: https://faucet.quicknode.com/base/sepolia  
3. **Optimism Sepolia**: https://faucet.quicknode.com/optimism/sepolia

### Deploy Commands

#### Arbitrum Sepolia
```bash
npx hardhat run contracts/scripts/deploy.ts --network arbitrumSepolia
```

#### Base Sepolia
```bash
npx hardhat run contracts/scripts/deploy.ts --network baseSepolia
```

#### Optimism Sepolia
```bash
npx hardhat run contracts/scripts/deploy.ts --network optimismSepolia
```

### Verify Contracts

After deployment:

```bash
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>
```

---

## 🧪 Testing

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test
```bash
npx hardhat test contracts/test/RentalVault.test.ts
```

### With Gas Report
```bash
REPORT_GAS=true npx hardhat test
```

### Coverage
```bash
npx hardhat coverage
```

---

## 📁 Project Structure

```
flash-lp/
├── hardhat.config.ts          # Hardhat configuration
├── contracts/
│   ├── src/                   # Solidity contracts
│   │   ├── RentalVault.sol
│   │   ├── RentalManager.sol
│   │   └── YellowChannelManager.sol
│   ├── scripts/               # Deployment scripts
│   │   └── deploy.ts
│   └── test/                  # Test files
│       └── RentalVault.test.ts
├── .env                       # Environment variables (gitignored)
└── package.json               # Dependencies
```

---

## 🔗 Frontend Integration

### 1. Export Contract ABIs

After compiling, ABIs are in `contracts/artifacts/`:

```bash
# Create ABI directory
mkdir -p src/lib/abis

# Copy ABIs (PowerShell)
Copy-Item "contracts/artifacts/src/RentalVault.sol/RentalVault.json" "src/lib/abis/"
Copy-Item "contracts/artifacts/src/RentalManager.sol/RentalManager.json" "src/lib/abis/"
Copy-Item "contracts/artifacts/src/YellowChannelManager.sol/YellowChannelManager.json" "src/lib/abis/"
```

### 2. Update `src/lib/contracts.ts`

```typescript
import RentalVaultABI from './abis/RentalVault.json'
import RentalManagerABI from './abis/RentalManager.json'
import YellowChannelABI from './abis/YellowChannelManager.json'

// Replace with your deployed addresses
export const CONTRACTS = {
  arbitrumSepolia: {
    rentalVault: '0x...',      // From deployment output
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

### 3. Use in Frontend

```typescript
import { useWriteContract } from 'wagmi'
import { CONTRACTS, ABIS } from '@/lib/contracts'

// Example: Create rental
const { writeContract } = useWriteContract()

await writeContract({
  address: CONTRACTS.arbitrumSepolia.rentalManager,
  abi: ABIS.rentalManager,
  functionName: 'createRental',
  args: [positionId, owner, duration, price, channelId],
  value: collateral
})
```

---

## 🛠️ Useful Commands

### Compile
```bash
npx hardhat compile
npx hardhat clean  # Clean cache
```

### Test
```bash
npx hardhat test
npx hardhat test --grep "should deposit"  # Run specific test
```

### Deploy
```bash
npx hardhat run contracts/scripts/deploy.ts --network <network>
```

### Verify
```bash
npx hardhat verify --network <network> <address> [constructor args]
```

### Local Node
```bash
npx hardhat node  # Start local blockchain
```

### Console
```bash
npx hardhat console --network <network>
```

---

## 📊 Contract Addresses

After deployment, save your addresses here:

### Arbitrum Sepolia
- RentalVault: `0x...`
- RentalManager: `0x...`
- YellowChannelManager: `0x...`

### Base Sepolia
- RentalVault: `0x...`
- RentalManager: `0x...`
- YellowChannelManager: `0x...`

### Optimism Sepolia
- RentalVault: `0x...`
- RentalManager: `0x...`
- YellowChannelManager: `0x...`

---

## 🐛 Troubleshooting

### "Cannot find module 'hardhat'"
```bash
npm install
```

### "Invalid nonce" or "Already known"
Wait 30 seconds between transactions, or increase gas price.

### Compilation fails
```bash
npx hardhat clean
npx hardhat compile
```

### Tests fail
Check that private key in `.env` has testnet ETH.

### Verification fails
Make sure:
1. Contract is deployed
2. API key is correct in `.env`
3. Network name matches `hardhat.config.ts`

---

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [Wagmi Hooks](https://wagmi.sh/)

---

## ✅ Deployment Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` with private key and RPCs
- [ ] Compile contracts (`npx hardhat compile`)
- [ ] Run tests (`npx hardhat test`)
- [ ] Get testnet ETH from faucets
- [ ] Deploy to testnet
- [ ] Verify contracts on Etherscan
- [ ] Copy ABIs to frontend (`src/lib/abis/`)
- [ ] Update contract addresses in `src/lib/contracts.ts`
- [ ] Test frontend integration

---

## 🎉 You're Ready!

Your smart contracts are ready to deploy with Hardhat - much easier than Foundry!

### Next Steps:
1. Run `npm install`
2. Create your `.env` file
3. Run `npx hardhat compile`
4. Deploy to testnet!

**Happy coding! 🚀**
