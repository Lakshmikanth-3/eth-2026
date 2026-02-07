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
        const { token, amount } = body;

        if (!process.env.PRIVATE_KEY) {
            // Fallback for demo if no key configured
            console.warn('No PRIVATE_KEY configured, returning mock channel ID');
            return NextResponse.json({
                channelId: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
            });
        }

        const service = await getYellowService();
        const channelId = await service.openChannel(token || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', BigInt(amount || 0));

        return NextResponse.json({ channelId });
    } catch (error: any) {
        console.error('Yellow API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
