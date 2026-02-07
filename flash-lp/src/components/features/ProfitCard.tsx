import { formatEther } from 'viem'
import { ProfitBreakdown } from '@/types/flashlp'

interface ProfitCardProps {
    profits?: ProfitBreakdown
    isLoading?: boolean
}

export default function ProfitCard({ profits, isLoading }: ProfitCardProps) {
    if (isLoading) {
        return (
            <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-24 mb-3"></div>
                    <div className="h-8 bg-gray-700 rounded w-32"></div>
                </div>
            </div>
        )
    }

    if (!profits) return null

    const netProfit = formatEther(profits.netProfit)
    // ROI comes as string from API serialization or bigint from direct hook
    const roi = Number(profits.roi) / 100 // Convert from basis points
    const isProfit = BigInt(profits.netProfit) > 0n

    return (
        <div className="border border-gray-700 rounded-lg p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Profit Analysis</h3>

            {/* Net Profit */}
            <div className="mb-4">
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                        {isProfit ? '+' : ''}{netProfit} ETH
                    </span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${isProfit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {roi > 0 ? '+' : ''}{roi.toFixed(2)}% ROI
                    </span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Fees Earned</span>
                    <span className="text-green-400 font-medium">
                        +{formatEther(profits.totalFeesEarned)} ETH
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Rental Cost</span>
                    <span className="text-red-400 font-medium">
                        {formatEther(profits.rentalCostPaid)} ETH
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Est. Gas Costs</span>
                    <span className="text-red-400 font-medium">
                        {formatEther(profits.gasCostEstimate)} ETH
                    </span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between items-center font-medium">
                    <span className="text-white">Net Profit</span>
                    <span className={isProfit ? 'text-green-400' : 'text-red-400'}>
                        {isProfit ? '+' : ''}{netProfit} ETH
                    </span>
                </div>
            </div>
        </div>
    )
}
