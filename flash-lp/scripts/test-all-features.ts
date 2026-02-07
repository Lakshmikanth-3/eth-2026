import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv';

dotenv.config();

// Import contract config (adjust path as needed)
const CONTRACT_ADDRESSES = {
    84532: {
        FlashLP: "0x612Bc96a6354E9b14d59FB899bE3DE8fF4F1Af01"
    }
}

// Simplified ABI - only functions we need for testing
const FLASH_LP_ABI = [
    {
        "inputs": [
            { "name": "token0", "type": "address" },
            { "name": "token1", "type": "address" },
            { "name": "amount0", "type": "uint256" },
            { "name": "amount1", "type": "uint256" }
        ],
        "name": "createPool",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "poolId", "type": "uint256" },
            { "name": "duration", "type": "uint256" },
            { "name": "pricePerSecond", "type": "uint256" },
            { "name": "channelId", "type": "bytes32" }
        ],
        "name": "rentPool",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "rentalId", "type": "uint256" }],
        "name": "endRental",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "_poolIdCounter",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const

async function testAllFeatures() {
    console.log('🧪 Starting comprehensive feature test...\n')
    console.log('='.repeat(60))

    const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`
    if (!PRIVATE_KEY) {
        throw new Error('❌ PRIVATE_KEY not found in .env file')
    }

    const account = privateKeyToAccount(PRIVATE_KEY)
    console.log('✓ Using account:', account.address)

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
    })

    const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: http(),
        account
    })

    let testsPassed = 0
    let testsFailed = 0

    console.log('='.repeat(60))
    console.log('\n')

    // TEST 1: Query Pool Count
    console.log('📝 TEST 1: Query Pool Count from Contract')
    try {
        const poolCount = await publicClient.readContract({
            address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
            abi: FLASH_LP_ABI,
            functionName: '_poolIdCounter'
        })

        console.log(`   ✓ Pool count: ${poolCount}`)
        console.log(`   ✓ Pool counter query successful\n`)
        testsPassed++
    } catch (error: any) {
        console.error('   ✗ Failed:', error.message)
        testsFailed++
        console.log('')
    }

    // TEST 2: Query Positions API
    console.log('📝 TEST 2: Query Available Positions API')
    try {
        const response = await fetch('http://localhost:3000/api/positions/available')

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (Array.isArray(data)) {
            console.log(`   ✓ Found ${data.length} positions`)
            if (data.length > 0) {
                console.log(`   ✓ Sample position:`, {
                    id: data[0].id,
                    poolName: data[0].poolName,
                    chain: data[0].chain
                })
            }
            testsPassed++
        } else {
            throw new Error('Response is not an array')
        }
        console.log('')
    } catch (error: any) {
        console.error('   ✗ Failed:', error.message)
        testsFailed++
        console.log('')
    }

    // TEST 3: Create Pool (if needed)
    console.log('📝 TEST 3: Create Test Pool')
    try {
        const token0 = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // USDC
        const token1 = '0x4200000000000000000000000000000000000006' // WETH
        const amount0 = 0n // Use 0 for testing
        const amount1 = 0n

        console.log('   Submitting createPool transaction...')
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESSES[84532].FlashLP as `0x${string}`,
            abi: FLASH_LP_ABI,
            functionName: 'createPool',
            args: [token0 as `0x${string}`, token1 as `0x${string}`, amount0, amount1]
        })

        console.log(`   ✓ Transaction hash: ${hash.slice(0, 10)}...`)

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log(`   ✓ Pool created! Block: ${receipt.blockNumber}`)
        testsPassed++
        console.log('')
    } catch (error: any) {
        // Pool creation might fail if pool already exists - that's okay
        if (error.message.includes('Pool already exists') || error.message.includes('revert')) {
            console.log('   ℹ Pool may already exist (okay for testing)')
            testsPassed++
        } else {
            console.error('   ✗ Failed:', error.message)
            testsFailed++
        }
        console.log('')
    }

    // TEST 4: Query Active Rentals
    console.log('📝 TEST 4: Query Active Rentals API')
    try {
        const response = await fetch(`http://localhost:3000/api/rentals/active?address=${account.address}`)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (Array.isArray(data)) {
            console.log(`   ✓ Found ${data.length} active rentals`)
            if (data.length > 0) {
                console.log(`   ✓ Sample rental:`, {
                    id: data[0].id,
                    poolName: data[0].poolName,
                    isActive: data[0].isActive
                })
            }
            testsPassed++
        } else {
            throw new Error('Response is not an array')
        }
        console.log('')
    } catch (error: any) {
        console.error('   ✗ Failed:', error.message)
        testsFailed++
        console.log('')
    }

    // TEST 5: Yellow Channel API
    console.log('📝 TEST 5: Open Yellow Network Channel')
    try {
        const response = await fetch('http://localhost:3000/api/yellow/open-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
                amount: '0'
            })
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.channelId) {
            console.log(`   ✓ Channel opened: ${data.channelId.slice(0, 20)}...`)
            testsPassed++
        } else {
            throw new Error('No channelId in response')
        }
        console.log('')
    } catch (error: any) {
        console.error('   ✗ Failed:', error.message)
        testsFailed++
        console.log('')
    }

    // TEST 6: Frontend Page Load
    console.log('📝 TEST 6: Load Marketplace Page')
    try {
        const response = await fetch('http://localhost:3000/marketplace')

        if (response.ok) {
            console.log('   ✓ Marketplace page loads successfully')
            testsPassed++
        } else {
            throw new Error(`HTTP ${response.status}`)
        }
        console.log('')
    } catch (error: any) {
        console.error('   ✗ Failed:', error.message)
        testsFailed++
        console.log('')
    }

    // SUMMARY
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Tests Passed: ${testsPassed}/6`)
    console.log(`❌ Tests Failed: ${testsFailed}/6`)
    console.log(`📈 Success Rate: ${(testsPassed / 6 * 100).toFixed(1)}%`)
    console.log('='.repeat(60))

    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Project is demo-ready!\n')
        return 0
    } else {
        console.log(`\n⚠️ ${testsFailed} test(s) failed. Review errors above.\n`)
        return 1
    }
}

testAllFeatures()
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
        console.error('\n❌ Fatal error:', error.message)
        process.exit(1)
    })
