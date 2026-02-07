import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const UNIFIED_FLASH_LP_V4 = '0xd2cc5a92f47f7b5cB726f58eCc4073c3F5dc00C5' as `0x${string}`;
const EXPECTED_V4_ROUTER = '0x8C85937cB4EFe36F6Df3dc4632B0b010afB440A0';

// Simple ABI for the two functions we need
const abi = [
    {
        inputs: [],
        name: 'v4Router',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'yellowChannelManager',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

async function main() {
    console.log('🔍 Verifying UnifiedFlashLPV4 Configuration\n');
    console.log(`Contract: ${UNIFIED_FLASH_LP_V4}\n`);

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL)
    });

    try {
        // Read v4Router from contract
        const v4RouterAddr = await publicClient.readContract({
            address: UNIFIED_FLASH_LP_V4,
            abi,
            functionName: 'v4Router'
        });

        // Read yellowChannelManager from contract
        const yellowMgrAddr = await publicClient.readContract({
            address: UNIFIED_FLASH_LP_V4,
            abi,
            functionName: 'yellowChannelManager'
        });

        console.log('📋 Contract Configuration:');
        console.log(`   V4Router:             ${v4RouterAddr}`);
        console.log(`   YellowChannelManager: ${yellowMgrAddr}\n`);

        console.log('📋 Expected Configuration:');
        console.log(`   V4Router:             ${EXPECTED_V4_ROUTER}\n`);

        // Verify
        if (v4RouterAddr.toLowerCase() === EXPECTED_V4_ROUTER.toLowerCase()) {
            console.log('✅ V4Router address is CORRECT!\n');
        } else {
            console.log('❌ V4Router address MISMATCH!');
            console.log(`   Expected: ${EXPECTED_V4_ROUTER}`);
            console.log(`   Got:      ${v4RouterAddr}\n`);
            console.log('⚠️  You need to update src/lib/contracts.ts with the correct address\n');
        }

        // Get contract bytecode to verify it's deployed
        const bytecode = await publicClient.getBytecode({ address: UNIFIED_FLASH_LP_V4 });
        console.log(`✅ Contract is deployed (bytecode length: ${bytecode?.length || 0})`);

    } catch (error: any) {
        console.error('❌ Error verifying contract:');
        console.error(error.message);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
