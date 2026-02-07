import { NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { YellowService } from '@/lib/yellow';

// Initialize Viem Clients Server-Side
const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x${string}`) || '0x0000000000000000000000000000000000000000000000000000000000000000');

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.ALCHEMY_RPC_URL || 'https://1rpc.io/sepolia'),
});

const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(),
    account,
});

// Singleton Service Instance (lazy init)
let yellowService: YellowService | null = null;

async function getYellowService() {
    if (!yellowService) {
        yellowService = new YellowService(publicClient, walletClient, account, sepolia.id);
        await yellowService.initialize();
        await yellowService.connectAndAuth();
    }
    return yellowService;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { channelId, finalBalance } = body;

        console.log('Received close request for channel:', channelId);

        if (!process.env.PRIVATE_KEY) {
            return NextResponse.json({
                txHash: '0xmock_settlement_tx_hash',
                status: 'settled_mock'
            });
        }

        const service = await getYellowService();
        // For MVP, we pass 0 as final balance just to trigger close
        const txHash = await service.closeChannel(channelId, BigInt(finalBalance || 0));

        return NextResponse.json({ txHash, status: 'settled' });
    } catch (error: any) {
        console.error('Yellow Close API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
