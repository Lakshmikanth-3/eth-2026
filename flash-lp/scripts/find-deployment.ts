import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

async function main() {
    const account = privateKeyToAccount(PRIVATE_KEY);
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    console.log(`🔍 Finding latest deployment from ${account.address}\n`);

    //Get current block
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Check last 100 blocks for contract deployments
    const fromBlock = currentBlock - 100n;

    console.log(`Searching blocks ${fromBlock} to ${currentBlock}...\n`);

    // Get transaction count to find recent transactions
    const txCount = await publicClient.getTransactionCount({ address: account.address });
    console.log(`Total transactions from account: ${txCount}\n`);

    // Get the most recent transaction
    if (txCount > 0) {
        // Try to get transaction by checking recent blocks
        for (let i = 0; i < 20; i++) {
            const blockNum = currentBlock - BigInt(i);
            try {
                const block = await publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true });

                // Find transactions from our address
                const ourTxs = (block.transactions as any[]).filter(
                    (tx: any) => tx.from?.toLowerCase() === account.address.toLowerCase() && tx.to === null
                );

                if (ourTxs.length > 0) {
                    console.log(`✅ Found contract deployment in block ${blockNum}:`);
                    for (const tx of ourTxs) {
                        const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
                        if (receipt.contractAddress) {
                            console.log(`\n📍 Contract Address: ${receipt.contractAddress}`);
                            console.log(`   Transaction: ${tx.hash}`);
                            console.log(`   Block: ${blockNum}`);
                            console.log(`   Gas Used: ${receipt.gasUsed}`);
                            console.log(`\n🌐 View on BaseScan:`);
                            console.log(`   https://sepolia.basescan.org/address/${receipt.contractAddress}`);

                            return receipt.contractAddress;
                        }
                    }
                }
            } catch (e) {
                // Block might not exist, continue
            }
        }
    }

    console.log('❌ No recent contract deployment found');
}

main().catch(console.error);
