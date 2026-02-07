const { createPublicClient, http, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const RPC_URL = 'https://sepolia.base.org';
const FLASH_LP_ADDRESS = '0xd1d6793c117e3b950c98d96b3d21fceb7f80934c';

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL)
});

const ABI = parseAbi(['function yellowChannelManager() view returns (address)']);

async function main() {
    const yellowMgr = await client.readContract({
        address: FLASH_LP_ADDRESS,
        abi: ABI,
        functionName: 'yellowChannelManager'
    });
    require('fs').writeFileSync('yellow_address_utf8.txt', yellowMgr, 'utf8');
    console.log('Written to yellow_address_utf8.txt');
} catch (e) {
    console.error('ERROR');
}
}

main();
