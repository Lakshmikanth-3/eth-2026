import { formatEther, formatUnits } from 'viem'
import { SwapDetail } from '@/types/flashlp'
import { ArrowRight, Download } from '@phosphor-icons/react'

interface SwapHistoryTableProps {
    swaps?: SwapDetail[]
    isLoading?: boolean
    rentalId?: bigint
}

export default function SwapHistoryTable({ swaps, isLoading, rentalId }: SwapHistoryTableProps) {
    const exportToCSV = () => {
        if (!swaps || swaps.length === 0) return

        const headers = ['Timestamp', 'Amount In', 'Amount Out', 'Fee', 'Gas Price', 'Cross-Chain', 'Chains']
        const rows = swaps.map(swap => [
            new Date(Number(swap.timestamp) * 1000).toISOString(),
            formatEther(swap.amountIn),
            formatEther(swap.amountOut),
            formatEther(swap.feeCharged),
            formatUnits(swap.gasPrice, 9),
            swap.isCrossChain ? 'Yes' : 'No',
            swap.isCrossChain ? `${swap.sourceChain} → ${swap.destChain}` : swap.sourceChain.toString()
        ])

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rental-${rentalId}-swaps.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (isLoading) {
        return (
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-32"></div>
                    <div className="h-10 bg-gray-700 rounded"></div>
                    <div className="h-10 bg-gray-700 rounded"></div>
                </div>
            </div>
        )
    }

    if (!swaps || swaps.length === 0) {
        return (
            <div className="border border-gray-700 rounded-lg p-6 bg-gray-800/30 text-center">
                <p className="text-gray-400">No swaps executed yet</p>
            </div>
        )
    }

    return (
        <div className="border border-gray-700 rounded-lg bg-gray-800/30 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Swap History ({swaps.length})</h3>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-900/50">
                        <tr className="text-left text-sm text-gray-400">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Amount In</th>
                            <th className="px-4 py-3">Amount Out</th>
                            <th className="px-4 py-3">Fee Earned</th>
                            <th className="px-4 py-3">Gas Price</th>
                            <th className="px-4 py-3">Cross-Chain</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {swaps.map((swap, index) => (
                            <tr key={index} className="hover:bg-gray-800/50 transition">
                                <td className="px-4 py-3 text-sm text-gray-300">
                                    {new Date(Number(swap.timestamp) * 1000).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono">
                                    {formatEther(swap.amountIn).substring(0, 8)} ETH
                                </td>
                                <td className="px-4 py-3 text-sm font-mono">
                                    {formatEther(swap.amountOut).substring(0, 8)} ETH
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-green-400">
                                    +{formatEther(swap.feeCharged).substring(0, 6)} ETH
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-400">
                                    {formatUnits(swap.gasPrice, 9).substring(0, 6)} Gwei
                                </td>
                                <td className="px-4 py-3">
                                    {swap.isCrossChain ? (
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-medium">
                                                {swap.sourceChain.toString()}
                                            </span>
                                            <ArrowRight size={14} className="text-gray-500" />
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded font-medium">
                                                {swap.destChain.toString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-sm">
                                            Same Chain
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
