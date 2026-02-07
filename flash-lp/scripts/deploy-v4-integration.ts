import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

// Deployment Configuration
const NETWORKS = {
    baseSepolia: {
        chainId: 84532,
        yellowChannelManager: '0xd546ed7c2e35f52187ab9160ebd1bf0713893be4',
        v4Router: '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0',
        rpc: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'
    },
    arbitrumSepolia: {
        chainId: 421614,
        yellowChannelManager: '0x92312a3c268184c28288b01485e36069502d9fa3',
        v4Router: '0x87bD55Ea0505005799a28D34B5Ca17f4c8d24301',
        rpc: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc'
    },
    ethereumSepolia: {
        chainId: 11155111,
        yellowChannelManager: '0x0000000000000000000000000000000000000000', // TODO: Deploy Yellow on Ethereum Sepolia
        v4Router: '0x6127b25A12AB31dF2B58Fe9DfFCba595AB927eA3',
        rpc: process.env.ETHEREUM_SEPOLIA_RPC || 'https://rpc.sepolia.org'
    }
};

async function main() {
    console.log('🚀 Deploying UnifiedFlashLPV4...\n');

    const network = process.env.NETWORK || 'baseSepolia';
    const config = NETWORKS[network as keyof typeof NETWORKS];

    if (!config) {
        throw new Error(`Unknown network: ${network}`);
    }

    console.log(`Network: ${network} (Chain ID: ${config.chainId})`);
    console.log(`YellowChannelManager: ${config.yellowChannelManager}`);
    console.log(`V4Router: ${config.v4Router}\n`);

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    // Deploy UnifiedFlashLPV4
    console.log('📦 Deploying UnifiedFlashLPV4...');
    const UnifiedFlashLPV4 = await ethers.getContractFactory('UnifiedFlashLPV4');
    const flashLP = await UnifiedFlashLPV4.deploy(
        config.yellowChannelManager,
        config.v4Router
    );

    await flashLP.waitForDeployment();
    const flashLPAddress = await flashLP.getAddress();

    console.log(`✅ UnifiedFlashLPV4 deployed to: ${flashLPAddress}\n`);

    // Verification info
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Deployment Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Network:              ${network}`);
    console.log(`Chain ID:             ${config.chainId}`);
    console.log(`UnifiedFlashLPV4:     ${flashLPAddress}`);
    console.log(`YellowChannelManager: ${config.yellowChannelManager}`);
    console.log(`V4Router:             ${config.v4Router}`);
    console.log('');

    // Save to deployments.json
    const fs = require('fs');
    const deploymentsPath = './deployments.json';

    let deployments = { deployments: [] };
    if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    // Add new deployment
    deployments.deployments.push({
        unifiedFlashLPV4: flashLPAddress,
        yellowChannelManager: config.yellowChannelManager,
        v4Router: config.v4Router,
        network: network.replace(/([A-Z])/g, ' $1').trim(),
        chainId: config.chainId,
        timestamp: new Date().toISOString()
    });

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`✅ Deployment saved to ${deploymentsPath}\n`);

    // Verification command
    if (network === 'baseSepolia' || network === 'arbitrumSepolia') {
        console.log('🔍 To verify on block explorer, run:');
        console.log(`npx hardhat verify --network ${network} ${flashLPAddress} "${config.yellowChannelManager}" "${config.v4Router}"`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
