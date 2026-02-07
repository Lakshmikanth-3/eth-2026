const fs = require('fs');
const path = require('path');

async function main() {
    console.log("📦 Extracting ABIs...\n");

    // Define contracts to extract
    const contracts = [
        'FlashLP',
        'UnifiedFlashLP',
        'RentalManager',
        'RentalVault',
        'YellowChannelManager'
    ];

    // Create ABI directory if it doesn't exist
    const abiDir = path.join(__dirname, '..', '..', 'src', 'lib', 'abis');
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
        console.log("✅ Created ABI directory:", abiDir, "\n");
    }

    let extracted = 0;
    let skipped = 0;

    // Extract ABIs
    for (const contractName of contracts) {
        try {
            const artifactPath = path.join(
                __dirname,
                '..',
                'artifacts',
                'contracts',
                'src',
                `${contractName}.sol`,
                `${contractName}.json`
            );

            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
                const abi = artifact.abi;

                const outputPath = path.join(abiDir, `${contractName}.json`);
                fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));

                console.log(`✅ ${contractName}.json`);
                extracted++;
            } else {
                console.log(`⚠️  ${contractName}.json - artifact not found, skipping`);
                skipped++;
            }
        } catch (error) {
            console.error(`❌ Error extracting ${contractName}:`, error.message);
            skipped++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Extracted: ${extracted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n✅ ABIs saved to: ${abiDir}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
