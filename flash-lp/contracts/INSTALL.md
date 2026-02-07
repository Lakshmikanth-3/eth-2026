# Flash LP - Smart Contract Installation Guide

## Prerequisites

Install Foundry (Ethereum development toolkit):

### Windows Installation

```powershell
# Download foundryup installer
curl -L https://foundry.paradigm.xyz | bash

# Add to PATH (restart terminal after)
# Foundry will be installed to: C:\Users\<YourUsername>\.foundry\bin

# Verify installation
foundryup
forge --version
cast --version
anvil --version
```

## Installing Dependencies

After Foundry is installed:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
forge install Uniswap/v4-core
```

## Build Contracts

```bash
forge build
```

## Run Tests

```bash
forge test
forge test -vvv  # Verbose output
forge coverage   # Coverage report
```

## Deploy to Testnet

1. Create `.env` file in project root:
```
PRIVATE_KEY=your_private_key_here
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
BASE_SEPOLIA_RPC=https://sepolia.base.org
OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io
ARBISCAN_API_KEY=your_key
BASESCAN_API_KEY=your_key
OPTIMISM_API_KEY=your_key
```

2. Deploy:
```bash
# Load environment variables
source .env

# Deploy to Arbitrum Sepolia
forge script script/Deploy.s.sol:DeployAll --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployAll --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
```

## Troubleshooting

If you get "forge: command not found":
1. Restart your terminal
2. Check PATH includes `C:\Users\<YourUsername>\.foundry\bin`
3. Run `foundryup` again

## Next Steps

After installation, I'll provide the complete contract implementations!
