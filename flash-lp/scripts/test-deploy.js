console.log('Testing script execution...')

try {
    require('dotenv').config()
    console.log('✓ dotenv loaded')

    const pk = process.env.PRIVATE_KEY
    console.log('✓ PRIVATE_KEY exists:', pk ? 'yes' : 'no')

    const fs = require('fs')
    const path = require('path')

    const artifactPath = path.join(__dirname, '../artifacts/contracts/src/UnifiedFlashLPV4.sol/UnifiedFlashLPV4.json')
    console.log('✓ Looking for artifact at:', artifactPath)

    if (fs.existsSync(artifactPath)) {
        console.log('✓ Artifact found!')
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
        console.log('✓ Artifact loaded, bytecode length:', artifact.bytecode.length)
    } else {
        console.log('✗ Artifact NOT found')
    }

} catch (error) {
    console.error('Error:', error.message)
    console.error(error.stack)
}

console.log('\nTest complete')
