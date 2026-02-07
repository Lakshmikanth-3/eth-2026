import {
    NitroliteClient,
    WalletStateSigner,
    createTransferMessage,
    createGetConfigMessage,
    createECDSAMessageSigner,
    createEIP712AuthMessageSigner,
    createAuthVerifyMessageFromChallenge,
    createCreateChannelMessage,
    createResizeChannelMessage,
    createGetLedgerBalancesMessage,
    createAuthRequestMessage,
    createCloseChannelMessage
} from '@erc7824/nitrolite';
import type {
    RPCNetworkInfo,
    RPCAsset,
    RPCData
} from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Wrap everything in an async main function to avoid top-level await
async function main() {
    console.log('Starting script...');

    // Helper to prompt for input
    const askQuestion = (query: string): Promise<string> => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }));
    };

    // Your wallet private key (use environment variables in production!)
    let PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

    if (!PRIVATE_KEY) {
        console.log('PRIVATE_KEY not found in .env');
        const inputKey = await askQuestion('Please enter your Private Key: ');
        if (!inputKey) {
            throw new Error('Private Key is required');
        }
        // Trim whitespace and ensure 0x prefix
        const cleanKey = inputKey.trim();
        PRIVATE_KEY = cleanKey.startsWith('0x') ? cleanKey as `0x${string}` : `0x${cleanKey}` as `0x${string}`;
    } else {
        // Also trim environment variable
        PRIVATE_KEY = PRIVATE_KEY.trim() as `0x${string}`;
        if (!PRIVATE_KEY.startsWith('0x')) {
            PRIVATE_KEY = `0x${PRIVATE_KEY}` as `0x${string}`;
        }
    }

    const account = privateKeyToAccount(PRIVATE_KEY);

    // Create viem clients
    const ALCHEMY_RPC_URL = process.env.ALCHEMY_RPC_URL;
    const FALLBACK_RPC_URL = 'https://1rpc.io/sepolia'; // Public fallback

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(ALCHEMY_RPC_URL || FALLBACK_RPC_URL),
    });

    const walletClient = createWalletClient({
        chain: sepolia,
        transport: http(),
        account,
    });

    interface Config {
        assets?: RPCAsset[];
        networks?: RPCNetworkInfo[];
        [key: string]: any;
    }

    async function fetchConfig(): Promise<Config> {
        const signer = createECDSAMessageSigner(PRIVATE_KEY);
        const message = await createGetConfigMessage(signer);

        const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');

        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                ws.send(message);
            };

            ws.onmessage = (event) => {
                try {
                    const response = JSON.parse(event.data.toString());
                    // Response format: [requestId, method, result, timestamp]
                    // or NitroliteRPCMessage structure depending on implementation
                    // Based on types: NitroliteRPCMessage { res: RPCData }
                    // RPCData: [RequestID, RPCMethod, object, Timestamp?]

                    if (response.res && response.res[2]) {
                        resolve(response.res[2] as Config);
                        ws.close();
                    } else if (response.error) {
                        reject(new Error(response.error.message || 'Unknown RPC error'));
                        ws.close();
                    }
                } catch (err) {
                    reject(err);
                    ws.close();
                }
            };

            ws.onerror = (error) => {
                reject(error);
                ws.close();
            };
        });
    }

    // Initialize Nitrolite client
    console.log('Fetching configuration...');
    const config = await fetchConfig();
    console.log('Configuration fetched. Assets count:', config.assets?.length);

    const client = new NitroliteClient({
        publicClient,
        walletClient,
        // Use WalletStateSigner for signing states
        stateSigner: new WalletStateSigner(walletClient),
        // Contract addresses
        addresses: {
            custody: '0x019B65A265EB3363822f2752141b3dF16131b262',
            adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2',
        },
        chainId: sepolia.id,
        challengeDuration: 3600n, // 1 hour challenge period
    });

    console.log('✓ Client initialized');
    console.log('  Wallet Address:', account.address);
    console.log('  (Please ensure this address has Sepolia ETH)');

    // Connect to Clearnode WebSocket (using sandbox for testing)
    const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');

    // Step 1: Generate session keypair locally
    const sessionPrivateKey = generatePrivateKey();
    const sessionAccount = privateKeyToAccount(sessionPrivateKey);
    const sessionAddress = sessionAccount.address;

    // Helper: Create a signer for the session key
    const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);

    // Step 2: Send auth_request
    const authParams = {
        session_key: sessionAddress,        // Session key you generated
        allowances: [{                      // Add allowance for ytest.usd
            asset: 'ytest.usd',
            amount: '1000000000'            // Large amount
        }],
        expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour in seconds
        scope: 'test.app',
    };

    const authRequestMsg = await createAuthRequestMessage({
        address: account.address,           // Your main wallet address
        application: 'Test app',            // Match domain name
        ...authParams
    });

    // We need to capture channelId to close it.
    let activeChannelId: string | undefined;

    // Helper function to trigger resize
    const triggerResize = async (channelId: string, token: string, skipResize: boolean = false) => {
        console.log('  Using existing channel:', channelId);

        // Add delay to ensure Node indexes the channel
        console.log('  Waiting 5s for Node to index channel...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // For withdrawal, we don't need to check user balance or allowance
        // because the Node (counterparty) is the one depositing funds.


        // For withdrawal, we don't deposit (we are withdrawing off-chain funds).
        // -------------------------------------------------------------------
        // 3. Fund Channel (Resize)
        // -------------------------------------------------------------------
        // We use 'allocate_amount' to move funds from the User's Unified Balance (off-chain)
        // into the Channel. This assumes the user has funds in their Unified Balance (e.g. from faucet).

        const amountToFund = 20n;
        if (!skipResize) console.log('\nRequesting resize to fund channel with 20 tokens...');

        if (!skipResize) {
            const resizeMsg = await createResizeChannelMessage(
                sessionSigner,
                {
                    channel_id: channelId as `0x${string}`,
                    // resize_amount: 10n, // <-- This requires L1 funds in Custody (which we don't have)
                    allocate_amount: amountToFund,  // <-- This pulls from Unified Balance (Faucet) (Variable name adjusted)
                    funds_destination: account.address,
                }
            );

            ws.send(resizeMsg);

            // Wait for resize confirmation
            console.log('  Waiting for resize confirmation...');
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Resize timeout')), 30000);
                const handler = (data: any) => {
                    const msg = JSON.parse(data.toString());
                    if (msg.res && msg.res[1] === 'resize_channel') {
                        const payload = msg.res[2];
                        if (payload.channel_id === channelId) {
                            clearTimeout(timeout);
                            ws.off('message', handler);
                            resolve();
                        }
                    }
                };
                ws.on('message', handler);
            });

            // Wait for balance update
            await new Promise(r => setTimeout(r, 2000));
            console.log('✓ Resize complete.');
        } else {
            console.log('  Skipping resize step (already funded).');
        }

        // Verify Channel Balance
        const channelBalances = await publicClient.readContract({
            address: client.addresses.custody,
            abi: [{
                name: 'getChannelBalances',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'channelId', type: 'bytes32' }, { name: 'tokens', type: 'address[]' }],
                outputs: [{ name: 'balances', type: 'uint256[]' }]
            }],
            functionName: 'getChannelBalances',
            args: [channelId as `0x${string}`, [token as `0x${string}`]],
        }) as bigint[];
        console.log(`✓ Channel funded with ${channelBalances[0]} USDC`);

        // Check User Balance again
        let finalUserBalance = 0n;
        try {
            const result = await publicClient.readContract({
                address: client.addresses.custody,
                abi: [{
                    type: 'function',
                    name: 'getAccountsBalances',
                    inputs: [{ name: 'users', type: 'address[]' }, { name: 'tokens', type: 'address[]' }],
                    outputs: [{ type: 'uint256[]' }],
                    stateMutability: 'view'
                }] as const,
                functionName: 'getAccountsBalances',
                args: [[client.account.address], [token as `0x${string}`]],
            }) as bigint[];
            finalUserBalance = result[0];
            console.log(`✓ User Custody Balance after resize: ${finalUserBalance}`);
        } catch (e) {
            console.warn('    Error checking final user balance:', e);
        }

        // -------------------------------------------------------------------
        // 4. Off-Chain Transfer
        // -------------------------------------------------------------------
    };

    // State to prevent infinite auth loops
    let isAuthenticated = false;

    // Step 3: Sign the challenge with your MAIN wallet (EIP-712)
    ws.onmessage = async (event) => {
        const response = JSON.parse(event.data.toString());
        console.log('Received WS message:', JSON.stringify(response, null, 2));

        if (response.error) {
            console.error('RPC Error:', response.error);
            process.exit(1); // Exit on error to prevent infinite loops
        }

        if (response.res && response.res[1] === 'auth_challenge') {
            if (isAuthenticated) {
                console.log('  Ignoring auth_challenge (already authenticated)');
                return;
            }

            const challenge = response.res[2].challenge_message;

            // Create EIP-712 typed data signature with main wallet
            const signer = createEIP712AuthMessageSigner(
                walletClient,
                authParams,
                { name: 'Test app' }
            );

            // Send auth_verify using builder
            // We sign with the MAIN wallet for the first verification
            const verifyMsg = await createAuthVerifyMessageFromChallenge(
                signer,
                challenge
            );

            ws.send(verifyMsg);
        }

        if (response.res && response.res[1] === 'auth_verify') {
            console.log('✓ Authenticated successfully');
            isAuthenticated = true; // Mark as authenticated
            const sessionKey = response.res[2].session_key;
            console.log('  Session key:', sessionKey);
            console.log('  JWT token received');

            // Query Ledger Balances
            const ledgerMsg = await createGetLedgerBalancesMessage(
                sessionSigner,
                account.address,
                Date.now()
            );
            ws.send(ledgerMsg);
            console.log('  Sent get_ledger_balances request...');

            // Wait for 'channels' message to proceed

        }

        if (response.res && response.res[1] === 'channels') {
            const channels = response.res[2].channels;
            const openChannel = channels.find((c: any) => c.status === 'open');

            // Derive token
            const chainId = sepolia.id;
            const supportedAsset = (config.assets as any)?.find((a: any) => a.chain_id === chainId);
            const token = supportedAsset ? supportedAsset.token : '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

            if (openChannel) {
                console.log('✓ Found existing open channel');

                // CORRECT: Check if channel is already funded
                const currentAmount = BigInt(openChannel.amount || 0); // Need to parse amount
                // Wait, standard RPC returns strings. Let's rely on openChannel structure.
                // openChannel object from logs: { ..., amount: "40", ... }

                if (BigInt(openChannel.amount) >= 20n) {
                    console.log(`  Channel already funded with ${openChannel.amount} USDC.`);
                    console.log('  Skipping resize to avoid "Insufficient Balance" errors.');
                    // Call triggerResize but indicate skipping actual resize
                    await triggerResize(openChannel.channel_id, token, true);
                } else {
                    await triggerResize(openChannel.channel_id, token, false);
                }
            } else {
                console.log('  No existing open channel found, creating new one...');
                console.log('  Using token:', token, 'for chain:', chainId);

                // Request channel creation
                const createChannelMsg = await createCreateChannelMessage(
                    sessionSigner,
                    {
                        chain_id: 11155111, // Sepolia
                        token: token,
                    }
                );
                ws.send(createChannelMsg);
            }
        }

        if (response.res && response.res[1] === 'create_channel') {
            const { channel_id, channel, state, server_signature } = response.res[2];
            activeChannelId = channel_id;

            console.log('✓ Channel prepared:', channel_id);
            console.log('  State object:', JSON.stringify(state, null, 2));

            // Transform state object to match UnsignedState interface
            const unsignedInitialState = {
                intent: state.intent,
                version: BigInt(state.version),
                data: state.state_data, // Map state_data to data
                allocations: state.allocations.map((a: any) => ({
                    destination: a.destination,
                    token: a.token,
                    amount: BigInt(a.amount),
                })),
            };

            // Submit to blockchain
            const createResult = await client.createChannel({
                channel,
                unsignedInitialState,
                serverSignature: server_signature,
            });

            // createChannel returns an object { txHash, ... } or just hash depending on version.
            // Based on logs: { channelId: ..., initialState: ..., txHash: ... }
            // We need to handle both or just the object.
            const txHash = typeof createResult === 'string' ? createResult : createResult.txHash;

            console.log('✓ Channel created on-chain:', txHash);
            console.log('  Waiting for transaction confirmation...');
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log('✓ Transaction confirmed');

            // Retrieve token from allocations

            const token = state.allocations[0].token;
            await triggerResize(channel_id, token, false);
        }

        if (response.res && response.res[1] === 'resize_channel') {
            const { channel_id, state, server_signature } = response.res[2];

            console.log('✓ Resize prepared');
            console.log('  Server returned allocations:', JSON.stringify(state.allocations, null, 2));

            // Construct the resize state object expected by the SDK
            const resizeState = {
                intent: state.intent,
                version: BigInt(state.version),
                data: state.state_data || state.data, // Handle potential naming differences
                allocations: state.allocations.map((a: any) => ({
                    destination: a.destination,
                    token: a.token,
                    amount: BigInt(a.amount),
                })),
                channelId: channel_id,
                serverSignature: server_signature,
            };

            console.log('DEBUG: resizeState:', JSON.stringify(resizeState, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2));

            let proofStates: any[] = [];
            try {
                const onChainData = await client.getChannelData(channel_id as `0x${string}`);
                console.log('DEBUG: On-chain channel data:', JSON.stringify(onChainData, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value, 2));
                if (onChainData.lastValidState) {
                    proofStates = [onChainData.lastValidState];
                }
            } catch (e) {
                console.log('DEBUG: Failed to fetch on-chain data:', e);
            }

            // Calculate total required for the token
            const token = resizeState.allocations[0].token;
            const requiredAmount = resizeState.allocations.reduce((sum: bigint, a: any) => {
                if (a.token === token) return sum + BigInt(a.amount);
                return sum;
            }, 0n);

            console.log(`  Waiting for channel funding (Required: ${requiredAmount})...`);

            // Poll for User's Custody Balance (since User allocation is increasing)
            let userBalance = 0n;
            let retries = 0;
            const userAddress = client.account.address;

            console.log(`  Checking User Custody Balance for ${userAddress}... [v2]`);

            // Check initial balance first
            try {
                const result = await publicClient.readContract({
                    address: client.addresses.custody,
                    abi: [
                        {
                            type: 'function',
                            name: 'getAccountsBalances',
                            inputs: [
                                { name: 'users', type: 'address[]' },
                                { name: 'tokens', type: 'address[]' }
                            ],
                            outputs: [{ type: 'uint256[]' }],
                            stateMutability: 'view'
                        }
                    ] as const,
                    functionName: 'getAccountsBalances',
                    args: [[userAddress], [token as `0x${string}`]],
                }) as bigint[];
                userBalance = result[0];
            } catch (e) {
                console.warn('    Error checking initial user balance:', e);
            }

            console.log('  Skipping L1 deposit (using off-chain faucet funds)...');

            if (true) { // Skip the wait loop as we just deposited
                // Define ABI fragment for getAccountsBalances
                const custodyAbiFragment = [
                    {
                        type: 'function',
                        name: 'getAccountsBalances',
                        inputs: [
                            { name: 'users', type: 'address[]' },
                            { name: 'tokens', type: 'address[]' }
                        ],
                        outputs: [{ type: 'uint256[]' }],
                        stateMutability: 'view'
                    }
                ] as const;

                while (retries < 30) { // Wait up to 60 seconds
                    try {
                        const result = await publicClient.readContract({
                            address: client.addresses.custody,
                            abi: custodyAbiFragment,
                            functionName: 'getAccountsBalances',
                            args: [[userAddress], [token as `0x${string}`]],
                        }) as bigint[];

                        userBalance = result[0];
                    } catch (e) {
                        console.warn('    Error checking user balance:', e);
                    }

                    if (userBalance >= requiredAmount) {
                        console.log(`✓ User funded in Custody (Balance: ${userBalance})`);
                        break;
                    }
                    await new Promise(r => setTimeout(r, 2000));
                    retries++;
                    if (retries % 5 === 0) console.log(`    User Custody Balance: ${userBalance}, Waiting...`);
                }

                if (userBalance < requiredAmount) {
                    console.error('Timeout waiting for User to fund Custody account');
                    console.warn('Proceeding with resize despite low user balance...');
                }
            } else {
                console.log(`✓ User funded in Custody (Balance: ${userBalance})`);
            }

            console.log('  Submitting resize to chain...');
            // Submit to blockchain
            const { txHash } = await client.resizeChannel({
                resizeState,
                proofStates: proofStates,
            });

            console.log('✓ Channel resized on-chain:', txHash);
            console.log('✓ Channel funded with 20 USDC');

            // Skip Transfer for debugging
            console.log('  Skipping transfer to verify withdrawal amount...');
            console.log('  Debug: channel_id =', channel_id);

            // Wait for server to sync state
            await new Promise(r => setTimeout(r, 3000));

            if (channel_id) {
                console.log('  Closing channel:', channel_id);
                const closeMsg = await createCloseChannelMessage(
                    sessionSigner,
                    channel_id as `0x${string}`,
                    account.address
                );
                ws.send(closeMsg);
            } else {
                console.log('  No channel ID available to close.');
            }
        }
        // const secondaryAddress = '0x7df1fef832b57e46de2e1541951289c04b2781aa';
        // console.log(`  Attempting Transfer to Secondary Wallet: ${secondaryAddress}...`);

        // const transferMsg = await createTransferMessage(
        //     sessionSigner,
        //     {
        //         destination: secondaryAddress,
        //         allocations: [{
        //             asset: 'ytest.usd',
        //             amount: '10'
        //         }]
        //     },
        //     Date.now()
        // );
        // ws.send(transferMsg);
        // console.log('  Sent transfer request...');

        // if (response.res && response.res[1] === 'transfer') {
        //     console.log('✓ Transfer complete!');
        //     console.log('  Amount: 10 USDC');

        //     if (activeChannelId) {
        //         console.log('  Closing channel:', activeChannelId);
        //         const closeMsg = await createCloseChannelMessage(
        //             sessionSigner,
        //             activeChannelId as `0x${string}`,
        //             account.address
        //         );
        //         ws.send(closeMsg);
        //     } else {
        //         console.log('  No active channel ID to close.');
        //     }
        // }

        if (response.res && response.res[1] === 'close_channel') {
            const { channel_id, state, server_signature } = response.res[2];
            console.log('✓ Close prepared');
            console.log('  Submitting close to chain...');

            // Submit to blockchain
            const txHash = await client.closeChannel({
                finalState: {
                    intent: state.intent,
                    version: BigInt(state.version),
                    data: state.state_data || state.data,
                    allocations: state.allocations.map((a: any) => ({
                        destination: a.destination,
                        token: a.token,
                        amount: BigInt(a.amount),
                    })),
                    channelId: channel_id,
                    serverSignature: server_signature,
                },
                stateData: state.state_data || state.data || '0x',
            });

            console.log('✓ Channel closed on-chain:', txHash);

            // Withdraw funds
            console.log('  Withdrawing funds...');
            const token = state.allocations[0].token;

            await new Promise(r => setTimeout(r, 2000)); // Wait for close to settle

            let withdrawableBalance = 0n;
            try {
                const result = await publicClient.readContract({
                    address: client.addresses.custody,
                    abi: [{
                        type: 'function',
                        name: 'getAccountsBalances',
                        inputs: [{ name: 'users', type: 'address[]' }, { name: 'tokens', type: 'address[]' }],
                        outputs: [{ type: 'uint256[]' }],
                        stateMutability: 'view'
                    }] as const,
                    functionName: 'getAccountsBalances',
                    args: [[client.account.address], [token as `0x${string}`]],
                }) as bigint[];
                withdrawableBalance = result[0];
                console.log(`✓ User Custody Balance (Withdrawable): ${withdrawableBalance}`);
            } catch (e) {
                console.warn('    Error checking withdrawable balance:', e);
            }

            if (withdrawableBalance > 0n) {
                console.log(`  Withdrawing ${withdrawableBalance} of ${token}...`);
                const withdrawalTx = await client.withdrawal(token as `0x${string}`, withdrawableBalance);
                console.log('✓ Funds withdrawn:', withdrawalTx);
            } else {
                console.log('  No funds to withdraw.');
            }

            process.exit(0);
        }
    };

    // Start the flow
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(authRequestMsg);
    } else {
        ws.on('open', () => {
            ws.send(authRequestMsg);
        });
    }
}

// Call the main function
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
