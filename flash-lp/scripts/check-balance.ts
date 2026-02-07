import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';

config();

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL)
});

const abi = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }];

async function main() {
    const usdc = await client.readContract({ address: USDC_ADDRESS, abi, functionName: 'balanceOf', args: [account.address] });
    const weth = await client.readContract({ address: WETH_ADDRESS, abi, functionName: 'balanceOf', args: [account.address] });
    const eth = await client.getBalance({ address: account.address });

    console.log(`Address: ${account.address}`);
    console.log(`ETH:     ${formatUnits(eth, 18)}`);
    console.log(`USDC:    ${formatUnits(usdc, 6)}`);
    console.log(`WETH:    ${formatUnits(weth, 18)}`);
}

main();
