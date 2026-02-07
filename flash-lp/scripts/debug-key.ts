import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';

config();

function debugKey() {
    const rawKey = process.env.PRIVATE_KEY;
    if (!rawKey) {
        console.log('PRIVATE_KEY not found in .env');
        return;
    }

    console.log(`Raw Key Length: ${rawKey.length}`);
    console.log(`First char: '${rawKey[0]}' (Code: ${rawKey.charCodeAt(0)})`);
    console.log(`Last char: '${rawKey[rawKey.length - 1]}' (Code: ${rawKey.charCodeAt(rawKey.length - 1)})`);

    // Check for common issues
    if (rawKey.includes('"')) console.log('WARNING: Key contains double quotes');
    if (rawKey.includes("'")) console.log('WARNING: Key contains single quotes');
    if (rawKey.includes(" ")) console.log('WARNING: Key contains spaces');

    try {
        const formattedKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;
        const account = privateKeyToAccount(formattedKey as `0x${string}`);
        console.log(`Derived Address: ${account.address}`);
    } catch (e) {
        console.log('Error deriving account:', e.message);
    }
}

debugKey();
