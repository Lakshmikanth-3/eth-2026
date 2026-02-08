
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '../contracts/artifacts/contracts/src');
const OUT_DIR = path.join(__dirname, '../src/lib/abis');

const CONTRACTS = [
    { name: 'YellowChannelManager', dir: 'YellowChannelManager.sol' },
    { name: 'RentalManager', dir: 'RentalManager.sol' },
    { name: 'RentalVault', dir: 'RentalVault.sol' },
    { name: 'TemporalAMM', dir: 'TemporalAMM.sol' },
    { name: 'PredictiveCommitment', dir: 'PredictiveCommitment.sol' },
    { name: 'VirtualLiquidityManager', dir: 'VirtualLiquidityManager.sol' },
    { name: 'TLVMCore', dir: 'TLVMCore.sol' }
];

function main() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    CONTRACTS.forEach(contract => {
        const artifactPath = path.join(ARTIFACTS_DIR, contract.dir, `${contract.name}.json`);

        try {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            const abiPath = path.join(OUT_DIR, `${contract.name}.json`);
            // We want to export it as a TS/JS constant or just JSON?
            // Let's just write pure JSON array
            fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
            console.log(`✅ Extracted ABI for ${contract.name}`);
        } catch (error) {
            console.error(`❌ Failed to extract ABI for ${contract.name}:`, error.message);
        }
    });
}

main();
