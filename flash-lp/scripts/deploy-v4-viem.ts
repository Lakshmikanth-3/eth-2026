import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

// Contract addresses
const YELLOW_CHANNEL_MANAGER = '0xd546ed7c2e35f52187ab9160ebd1bf0713893be4';
const V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';

async function main() {
    console.log('🚀 Deploying UnifiedFlashLPV4 to Base Sepolia\n');

    const account = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    console.log(`Deployer: ${account.address}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${Number(balance) / 1e18} ETH\n`);

    // Read compiled contract
    const artifactPath = path.join(process.cwd(), 'contracts', 'artifacts', 'src', 'UnifiedFlashLPV4.sol', 'UnifiedFlashLPV4.json');

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Contract artifact not found at ${artifactPath}. Run 'npm run compile' first.`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bytecode = artifact.bytecode as `0x${string}`;
    const abi = artifact.abi;

    console.log('📦 Deploying contract...');
    console.log(`YellowChannelManager: ${YELLOW_CHANNEL_MANAGER}`);
    console.log(`V4Router: ${V4_ROUTER}\n`);

    // Deploy
    const hash = await walletClient.deployContract({
        abi,
        bytecode,
        args: [YELLOW_CHANNEL_MANAGER, V4_ROUTER],
    });

    console.log(`Transaction hash: ${hash}`);
    console.log('⏳ Waiting for confirmation...\n');

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (!receipt.contractAddress) {
        throw new Error('Contract deployment failed - no contract address in receipt');
    }

    console.log('✅ UnifiedFlashLPV4 deployed successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Deployment Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Network:              Base Sepolia`);
    console.log(`Chain ID:             84532`);
    console.log(`UnifiedFlashLPV4:     ${receipt.contractAddress}`);
    console.log(`YellowChannelManager: ${YELLOW_CHANNEL_MANAGER}`);
    console.log(`V4Router:             ${V4_ROUTER}`);
    console.log(`Block Number:         ${receipt.blockNumber}`);
    console.log(`Gas Used:             ${receipt.gasUsed}`);
    console.log('');

    // Save to deployments.json
    const deploymentsPath = './deployments.json';

    let deployments: any = { deployments: [] };
    if (fs.existsSync(deploymentsPath)) {
        deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    }

    deployments.deployments.push({
        unifiedFlashLPV4: receipt.contractAddress,
        yellowChannelManager: YELLOW_CHANNEL_MANAGER,
        v4Router: V4_ROUTER,
        network: 'Base Sepolia',
        chainId: 84532,
        timestamp: new Date().toISOString(),
        txHash: hash,
        blockNumber: receipt.blockNumber.toString()
    });

    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
    console.log(`✅ Saved to ${deploymentsPath}\n`);

    console.log('🔍 Block Explorer:');
    console.log(`https://sepolia.basescan.org/address/${receipt.contractAddress}\n`);

    console.log('📝 To verify:');
    console.log(`npx hardhat verify --network baseSepolia ${receipt.contractAddress} "${YELLOW_CHANNEL_MANAGER}" "${V4_ROUTER}"`);
}

main().catch(console.error);
