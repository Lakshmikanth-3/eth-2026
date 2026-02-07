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
    console.log(`Checking Yellow Manager for FlashLP: ${FLASH_LP_ADDRESS}`);
    try {
        const yellowMgr = await client.readContract({
            address: FLASH_LP_ADDRESS,
            abi: ABI,
            functionName: 'yellowChannelManager'
        });
        console.log(`Yellow Manager Address: ${yellowMgr}`);
        require('fs').writeFileSync('yellow_address_clean.txt', yellowMgr);
    } catch (e) {
        console.error(e);
    }
}

main();
