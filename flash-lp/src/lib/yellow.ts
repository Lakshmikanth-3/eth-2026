import {
    NitroliteClient,
    WalletStateSigner,
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
import { type PublicClient, type WalletClient, type Account } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Use native WebSocket in browser, 'ws' in Node
const WebSocketClass = typeof window !== 'undefined' ? window.WebSocket : require('ws');

export class YellowService {
    private client: NitroliteClient | null = null;
    private ws: WebSocket | null = null;
    private isAuthenticated = false;
    private sessionSigner: any = null;
    private sessionAddress: string | null = null;

    constructor(
        private publicClient: PublicClient,
        private walletClient: WalletClient,
        private account: Account, // Main wallet account
        private chainId: number
    ) { }

    async initialize() {
        console.log('Initializing Yellow Service...');

        // 1. Initialize Nitrolite Client
        this.client = new NitroliteClient({
            publicClient: this.publicClient,
            walletClient: this.walletClient,
            stateSigner: new WalletStateSigner(this.walletClient),
            addresses: {
                custody: '0x019B65A265EB3363822f2752141b3dF16131b262', // Sepolia
                adjudicator: '0x7c7ccbc98469190849BCC6c926307794fDfB11F2', // Sepolia
            },
            chainId: this.chainId,
            challengeDuration: 3600n,
        });

        // 2. Generate Session Key
        const sessionPrivateKey = generatePrivateKey();
        this.sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
        this.sessionAddress = privateKeyToAccount(sessionPrivateKey).address;

        console.log('Session Key Generated:', this.sessionAddress);
    }

    async connectAndAuth() {
        if (!this.sessionAddress || !this.account) throw new Error('Not initialized');

        return new Promise<void>((resolve, reject) => {
            this.ws = new WebSocketClass('wss://clearnet-sandbox.yellow.com/ws');

            if (!this.ws) throw new Error('Failed to create WebSocket');

            const authParams = {
                session_key: this.sessionAddress,
                allowances: [{
                    asset: 'ytest.usd',
                    amount: '1000000000'
                }],
                expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
                scope: 'test.app',
            };

            this.ws.onopen = async () => {
                console.log('WS Connected');
                const authRequestMsg = await createAuthRequestMessage({
                    address: this.account.address,
                    application: 'Test app',
                    ...authParams
                });
                this.ws?.send(authRequestMsg);
            };

            this.ws.onmessage = async (event: any) => {
                try {
                    const response = JSON.parse(event.data.toString());

                    if (response.error) {
                        console.error('RPC Error:', response.error);
                        reject(new Error(response.error.message));
                        return;
                    }

                    // Handle Auth Challenge
                    if (response.res && response.res[1] === 'auth_challenge') {
                        const challenge = response.res[2].challenge_message;

                        // Sign with Main Wallet (EIP-712)
                        const signer = createEIP712AuthMessageSigner(
                            this.walletClient,
                            authParams,
                            { name: 'Test app' }
                        );

                        const verifyMsg = await createAuthVerifyMessageFromChallenge(
                            signer,
                            challenge
                        );

                        this.ws?.send(verifyMsg);
                    }

                    // Handle Auth Success
                    if (response.res && response.res[1] === 'auth_verify') {
                        console.log('Authenticated!');
                        this.isAuthenticated = true;
                        resolve();
                    }

                } catch (e) {
                    console.error('WS Message Error:', e);
                }
            };

            this.ws.onerror = (e: any) => {
                console.error('WS Error:', e);
                reject(e);
            };
        });
    }

    async openChannel(token: string, amount: bigint) {
        if (!this.ws || !this.isAuthenticated || !this.sessionSigner) {
            throw new Error('Not connected/authenticated');
        }

        return new Promise<string>((resolve, reject) => {
            const handler = async (event: any) => {
                const response = JSON.parse(event.data.toString());

                // Handle Channel List -> Create if needed
                if (response.res && response.res[1] === 'channels') {
                    const channels = response.res[2].channels;
                    const openChannel = channels.find((c: any) => c.status === 'open');

                    if (openChannel) {
                        console.log('Found existing channel:', openChannel.channel_id);
                        // In real app, might want to check balance/resize
                        this.ws?.removeEventListener('message', handler);
                        resolve(openChannel.channel_id);
                    } else {
                        console.log('Creating new channel...');
                        const createMsg = await createCreateChannelMessage(
                            this.sessionSigner,
                            {
                                chain_id: 11155111, // Sepolia
                                token: token,
                            }
                        );
                        this.ws?.send(createMsg);
                    }
                }

                // Handle Create Channel Response
                if (response.res && response.res[1] === 'create_channel') {
                    const { channel_id, channel, state, server_signature } = response.res[2];

                    // On-chain submission would go here (using this.client.createChannel)
                    // For now, returning the ID to simulate flow

                    this.ws?.removeEventListener('message', handler);
                    resolve(channel_id);
                }
            };

            this.ws?.addEventListener('message', handler);

            // Trigger Fetch Channels to start flow
            createGetLedgerBalancesMessage(
                this.sessionSigner,
                this.account.address,
                Date.now()
            ).then((msg: string) => this.ws?.send(msg));
        });
    }

    async closeChannel(channelId: string, finalBalance: bigint) {
        if (!this.ws || !this.isAuthenticated || !this.sessionSigner) {
            throw new Error('Not connected/authenticated');
        }

        return new Promise<string>((resolve, reject) => {
            const handler = async (event: any) => {
                const response = JSON.parse(event.data.toString());

                if (response.error) {
                    console.error('Yellow Close Error:', response.error);
                    // Don't reject immediately, might be other messages
                }

                if (response.res && response.res[1] === 'close_channel') {
                    const { channel_id, state, server_signature } = response.res[2];

                    if (channel_id !== channelId) return;

                    console.log('Close prepared, submitting to chain...');

                    try {
                        // Submit to blockchain
                        // Note: finalState construction might need adjustment based on exact SDK version types
                        const txHash = await this.client!.closeChannel({
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

                        this.ws?.removeEventListener('message', handler);
                        resolve(typeof txHash === 'string' ? txHash : (txHash as any).txHash);
                    } catch (e) {
                        this.ws?.removeEventListener('message', handler);
                        reject(e);
                    }
                }
            };

            this.ws?.addEventListener('message', handler);

            // Send close request
            createCloseChannelMessage(
                this.sessionSigner,
                channelId as `0x${string}`,
                this.account.address
            ).then((msg: string) => this.ws?.send(msg));
        });
    }
}
