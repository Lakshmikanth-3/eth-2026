'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount, useReadContract, usePublicClient } from 'wagmi'
import { parseEther, erc20Abi, formatUnits, parseUnits } from 'viem'
import { CONTRACT_ADDRESSES, ABIS } from '@/lib/contracts'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function ListPage() {
    const chainId = useChainId()
    const { address, isConnected } = useAccount()
    const publicClient = usePublicClient()
    const [formData, setFormData] = useState({
        token0: '',
        token1: '',
        amount0: '',
        amount1: ''
    })

    // Transaction states
    const { writeContractAsync, isPending: isWritePending } = useWriteContract()
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined)

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash
    })

    // Approval states
    const [needsApproval0, setNeedsApproval0] = useState(false)
    const [needsApproval1, setNeedsApproval1] = useState(false)
    const [isApproving, setIsApproving] = useState(false)

    // Decimal states
    const [decimals0, setDecimals0] = useState(18)
    const [decimals1, setDecimals1] = useState(18)

    // Helper to parse amount with correct decimals
    const parseAmount = (amount: string, decimals: number) => {
        if (!amount) return 0n
        try {
            return parseUnits(amount, decimals)
        } catch (e) {
            console.error('Error parsing amount:', e)
            return 0n
        }
    }

    // Check allowances when form changes
    const checkAllowances = async () => {
        if (!formData.token0 || !formData.token1 || !address || !publicClient) return

        try {
            const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
            if (!addresses) return

            // Check Token 0
            if (parseFloat(formData.amount0 || '0') > 0) {
                const allowance0 = await publicClient.readContract({
                    address: formData.token0 as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'allowance',
                    args: [address, addresses.FlashLP as `0x${string}`]
                })
                const required0 = parseAmount(formData.amount0, decimals0)
                setNeedsApproval0(allowance0 < required0)
            } else {
                setNeedsApproval0(false)
            }

            // Check Token 1
            if (parseFloat(formData.amount1 || '0') > 0) {
                const allowance1 = await publicClient.readContract({
                    address: formData.token1 as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'allowance',
                    args: [address, addresses.FlashLP as `0x${string}`]
                })
                const required1 = parseAmount(formData.amount1, decimals1)
                setNeedsApproval1(allowance1 < required1)
            } else {
                setNeedsApproval1(false)
            }
        } catch (e) {
            console.error('Error checking allowance:', e)
        }
    }

    // Fetch decimals when tokens change
    useEffect(() => {
        const fetchDecimals = async () => {
            if (!publicClient) return

            // Token 0
            if (formData.token0 && /^0x[a-fA-F0-9]{40}$/.test(formData.token0)) {
                try {
                    const d0 = await publicClient.readContract({
                        address: formData.token0 as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'decimals'
                    })
                    setDecimals0(d0)
                } catch (e) {
                    console.warn('Failed to fetch token0 decimals, using 18', e)
                    setDecimals0(18)
                }
            }

            // Token 1
            if (formData.token1 && /^0x[a-fA-F0-9]{40}$/.test(formData.token1)) {
                try {
                    const d1 = await publicClient.readContract({
                        address: formData.token1 as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'decimals'
                    })
                    setDecimals1(d1)
                } catch (e) {
                    console.warn('Failed to fetch token1 decimals, using 18', e)
                    setDecimals1(18)
                }
            }
        }
        fetchDecimals()
    }, [formData.token0, formData.token1, publicClient])

    // Poll allowances
    useEffect(() => {
        checkAllowances()
        const timer = setInterval(checkAllowances, 3000)
        return () => clearInterval(timer)
    }, [formData, chainId, address])


    const handleApprove = async (tokenAddress: string, amount: string, decimals: number) => {
        try {
            setIsApproving(true)
            const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]

            const hash = await writeContractAsync({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'approve',
                args: [addresses.FlashLP as `0x${string}`, parseAmount(amount, decimals)]
            })

            toast.loading('Approving token...', { id: 'approve' })
            await publicClient?.waitForTransactionReceipt({ hash })
            toast.success('Token Approved!', { id: 'approve' })

            // Re-check
            checkAllowances()
        } catch (error: any) {
            console.error('Approval error:', error)
            toast.error(error.shortMessage || 'Failed to approve token')
        } finally {
            setIsApproving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            // Validate inputs
            if (!formData.token0 || !formData.token1) {
                toast.error('Please enter both token addresses')
                return
            }

            // Approval Checks
            if (needsApproval0) {
                return handleApprove(formData.token0, formData.amount0, decimals0)
            }
            if (needsApproval1) {
                return handleApprove(formData.token1, formData.amount1, decimals1)
            }

            // Get contract address
            const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
            if (!addresses) {
                toast.error('Switch network')
                return
            }

            // Create pool
            const hash = await writeContractAsync({
                address: addresses.FlashLP as `0x${string}`,
                abi: ABIS.FlashLP,
                functionName: 'createPool',
                args: [
                    formData.token0 as `0x${string}`,
                    formData.token1 as `0x${string}`,
                    parseAmount(formData.amount0 || '0', decimals0),
                    parseAmount(formData.amount1 || '0', decimals1)
                ]
            })

            setTxHash(hash)
            toast.loading('Creating pool...', { id: 'create' })

        } catch (error: any) {
            console.error('Error creating pool:', error)
            // Show REAL error from wallet
            toast.error(error.shortMessage || error.message || 'Failed to initiate transaction')
        }
    }

    // Reset form on success
    useEffect(() => {
        if (isSuccess) {
            toast.success('Pool Created Successfully!', { id: 'create' })
            setFormData({ token0: '', token1: '', amount0: '', amount1: '' })
            setTxHash(undefined)
        }
    }, [isSuccess])

    if (!isConnected) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-surface flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-6">
                        <ConnectButton />
                    </div>
                </main>
                <Footer />
            </>
        )
    }

    const isBusy = isWritePending || isConfirming || isApproving

    return (
        <>
            <Header />
            <div className="min-h-screen bg-surface py-12">
                <div className="max-w-2xl mx-auto px-6">
                    <div className="mb-8">
                        <h1 className="text-4xl font-black text-text-primary mb-2">
                            List Your LP Position
                        </h1>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Token 0 */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">Token 0 Address</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border rounded-xl"
                                    value={formData.token0}
                                    onChange={(e) => setFormData({ ...formData, token0: e.target.value })}
                                />
                            </div>

                            {/* Token 1 */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">Token 1 Address</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border rounded-xl"
                                    value={formData.token1}
                                    onChange={(e) => setFormData({ ...formData, token1: e.target.value })}
                                />
                            </div>

                            {/* Amounts */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Amount 0</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 border rounded-xl"
                                        value={formData.amount0}
                                        onChange={(e) => setFormData({ ...formData, amount0: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Amount 1</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 border rounded-xl"
                                        value={formData.amount1}
                                        onChange={(e) => setFormData({ ...formData, amount1: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Steps Indicator */}
                            {(parseFloat(formData.amount0) > 0 || parseFloat(formData.amount1) > 0) && (
                                <div className="flex justify-between text-sm text-text-secondary mb-4 px-1">
                                    <span className={needsApproval0 ? 'font-bold text-primary' : !needsApproval0 ? 'text-green-600' : ''}>
                                        {needsApproval0 ? '1️⃣ Approve Token 0' : '✅ Token 0 Approved'}
                                    </span>
                                    <span className={needsApproval1 ? 'font-bold text-primary' : !needsApproval1 && !needsApproval0 ? 'text-green-600' : ''}>
                                        {needsApproval1 ? '2️⃣ Approve Token 1' : !needsApproval0 ? '✅ Token 1 Approved' : '2️⃣ Approve Token 1'}
                                    </span>
                                    <span className={!needsApproval0 && !needsApproval1 ? 'font-bold text-primary' : ''}>
                                        3️⃣ Create Pool
                                    </span>
                                </div>
                            )}

                            {/* Dynamic Button */}
                            <button
                                type="submit"
                                disabled={isBusy}
                                className={`w-full py-4 rounded-xl font-bold text-white transition-all ${isBusy ? 'bg-gray-400' : 'bg-primary hover:bg-primary-600'}`}
                            >
                                {isApproving ? 'Approving... Check Wallet' :
                                    isConfirming ? 'Creating Pool... Check Wallet' :
                                        needsApproval0 ? 'Step 1: Approve Token 0' :
                                            needsApproval1 ? 'Step 2: Approve Token 1' :
                                                'Step 3: Create Pool'}
                            </button>

                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}
