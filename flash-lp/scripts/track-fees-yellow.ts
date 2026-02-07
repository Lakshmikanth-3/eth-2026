import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, encodePacked, keccak256, toBytes } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

// Configuration
const FLASH_LP_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';
const YELLOW_MANAGER_ADDRESS = '0xD546eD7c2e35F52187Ab9160Ebd1Bf0713893be4'; // Verified Checksum
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found');
    process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL)
});

const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL)
});

// Load ABIs
const loadABI = (name) => {
    const path = join(__dirname, `../contracts/artifacts/contracts/src/${name}.sol/${name}.json`);
    return JSON.parse(readFileSync(path, 'utf-8')).abi;
};

const flashLPABI = loadABI('UnifiedFlashLPV4');
const yellowABI = loadABI('YellowChannelManager');
const erc20ABI = [
    { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
    { name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
];

async function main() {
    console.log('\n🟡 Tracking Rental Fees with Yellow Channel');
    console.log('==========================================');
    console.log(`User/Renter: ${account.address}`);

    // 1. Rent Pool #1 (Assuming it exists)
    const poolId = 1n;
    const duration = 3600n;
    // 0. Get Pool Owner
    console.log('\n0️⃣  Getting Pool Owner...');
    const poolInfo = await client.readContract({
        address: FLASH_LP_ADDRESS,
        abi: flashLPABI,
        functionName: 'pools',
        args: [poolId]
    });
    // poolInfo is structure. owner is index 0.
    // Viem returns array or object depending on ABI. Struct returns array usually if not named.
    // Let's assume array: [owner, token0, token1, ...]
    const poolOwner = poolInfo[0];
    console.log(`   Pool Owner: ${poolOwner}`);

    // 1. Open Yellow Channel FIRST
    console.log('\n1️⃣  Opening Yellow Rental Channel...');
    const depositAmount = parseUnits('0.0001', 18); // 0.0001 ETH Deposit

    // Check if we already have a channel with this owner?
    // YellowManager doesn't track by rentalId anymore.
    // We just create a NEW channel for every rental attempt in this script for simplicity,
    // or we check 'getParticipantChannels' and see if one exists?
    // For demo, just create new.

    console.log('   Creating new channel...');
    let channelId;
    try {
        const openHash = await wallet.writeContract({
            address: YELLOW_MANAGER_ADDRESS,
            abi: yellowABI,
            functionName: 'openChannel', // Use standard function
            args: [poolOwner, duration],
            value: depositAmount
        });
        console.log(`   Tx Hash: ${openHash}`);
        const openReceipt = await client.waitForTransactionReceipt({ hash: openHash });
        if (openReceipt.status !== 'success') {
            throw new Error(`Open Channel Reverted! ${openHash}`);
        }
        console.log('✅ Channel Opened');

        // Find the channelId from logs (Topic 1)
        // Event ChannelOpened(bytes32 indexed channelId, ...)
        const log = openReceipt.logs[0];
        channelId = log.topics[1]; // First indexed arg
        console.log(`   Channel ID: ${channelId}`);
    } catch (e) {
        console.error('❌ Failed to open channel:', e.message || e);
        process.exit(1);
    }

    // 2. Rent Pool using Channel ID
    console.log('\n2️⃣  Renting Pool on-chain...');
    let rentalId;
    try {
        const rentHash = await wallet.writeContract({
            address: FLASH_LP_ADDRESS,
            abi: flashLPABI,
            functionName: 'rentPool',
            args: [poolId, duration, 0n, channelId], // Pass REAL channelId
        });
        console.log(`   Tx Hash: ${rentHash}`);
        await client.waitForTransactionReceipt({ hash: rentHash });
        console.log('✅ Pool Rented');

        // Get Rental ID
        const rentals = await client.readContract({
            address: FLASH_LP_ADDRESS,
            abi: flashLPABI,
            functionName: 'getRenterRentals',
            args: [account.address]
        });
        rentalId = rentals[rentals.length - 1];
        console.log(`   Rental ID: ${rentalId}`);
    } catch (e) {
        console.error('❌ Failed to rent pool:', e.message || e);
        process.exit(1);
    }


    // 3. Perform Off-chain Fee Tracking for Swaps
    let offChainBalanceRenter = depositAmount;
    let offChainBalanceOwner = 0n;
    let nonce = 0n;
    const feePerSwap = parseUnits('0.00001', 18); // 0.00001 ETH per swap

    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    const wethABI = [
        { name: 'deposit', type: 'function', inputs: [], outputs: [], stateMutability: 'payable' },
        { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }
    ];

    console.log('\n3️⃣  Executing Swaps & Tracking Fees...');

    // A. Wrap ETH to WETH
    console.log('   Wrapping ETH to WETH...');
    const wrapAmount = parseUnits('0.002', 18);
    const wrapHash = await wallet.writeContract({
        address: WETH_ADDRESS,
        abi: wethABI,
        functionName: 'deposit',
        // value: wrapAmount, // Wait, value is passed in 'value' field, not args
        value: wrapAmount
    });
    console.log(`   Tx Hash: ${wrapHash}`);
    await client.waitForTransactionReceipt({ hash: wrapHash });
    console.log('   ✅ Wrapped 0.002 ETH');

    // B. Approve WETH
    const approveHash = await wallet.writeContract({
        address: WETH_ADDRESS,
        abi: wethABI,
        functionName: 'approve',
        args: [FLASH_LP_ADDRESS, wrapAmount]
    });
    console.log(`   Tx Hash: ${approveHash}`);
    await client.waitForTransactionReceipt({ hash: approveHash });
    console.log('   ✅ WETH Approved');

    for (let i = 1; i <= 2; i++) {
        console.log(`\n   --- Swap #${i} ---`);

        // C. Execute On-Chain Swap (WETH -> USDC)
        console.log(`   Detailed: Executing Swap...`);
        console.log(`     TokenIn: ${WETH_ADDRESS}`);
        console.log(`     AmountIn: ${parseUnits('0.0001', 18)}`); // Small WETH amount

        try {
            const swapHash = await wallet.writeContract({
                address: FLASH_LP_ADDRESS,
                abi: flashLPABI,
                functionName: 'executeSwap',
                args: [rentalId, WETH_ADDRESS, parseUnits('0.0001', 18), 0n]
            });
            console.log(`   Tx Hash: ${swapHash}`);
            await client.waitForTransactionReceipt({ hash: swapHash });
            console.log(`   ✅ On-Chain Swap Executed`);
        } catch (swapError) {
            console.error(`   ❌ Swap Failed:`, swapError.message || swapError);
            throw swapError;
        }

        // B. Update Off-Chain State
        nonce++;
        offChainBalanceRenter -= feePerSwap;
        offChainBalanceOwner += feePerSwap;

        console.log(`   📝 Updating Channel State (Off-chain)`);
        console.log(`      Owner Balance: ${formatUnits(offChainBalanceOwner, 18)} ETH`);

        // Sign State
        // Message: keccak256(channelId, bal1, bal2, nonce)
        const messageHash = keccak256(encodePacked(
            ['bytes32', 'uint256', 'uint256', 'uint256'],
            [channelId, offChainBalanceRenter, offChainBalanceOwner, nonce]
        ));

        // In real app, Renter signs. Owner signs.
        // Here 'account' is both (for demo simplicty)
        const signature = await wallet.signMessage({ message: { raw: messageHash } });

        // Store signature (simulated)
        console.log(`      ✍️  Signed State Update #${nonce}`);
    }

    // 4. Settle Channel
    console.log('\n4️⃣  Settling Channel On-Chain...');

    // Need signatures from both steps.
    // Re-sign final state for both participants (account is both)
    const finalMessageHash = keccak256(encodePacked(
        ['bytes32', 'uint256', 'uint256', 'uint256', 'string'],
        [channelId, offChainBalanceRenter, offChainBalanceOwner, nonce, 'close']
    ));

    const sig1 = await wallet.signMessage({ message: { raw: finalMessageHash } });
    const sig2 = sig1; // Self-channel

    const closeHash = await wallet.writeContract({
        address: YELLOW_MANAGER_ADDRESS,
        abi: yellowABI,
        functionName: 'closeChannel',
        args: [channelId, offChainBalanceRenter, offChainBalanceOwner, nonce, sig1, sig2]
    });
    console.log(`   Tx Hash: ${closeHash}`);

    await client.waitForTransactionReceipt({ hash: closeHash });
    console.log('✅ Channel Closed & Settled');
    console.log(`💰 Owner received ${formatUnits(offChainBalanceOwner, 18)} ETH as Rental Fees`);


}

main();
