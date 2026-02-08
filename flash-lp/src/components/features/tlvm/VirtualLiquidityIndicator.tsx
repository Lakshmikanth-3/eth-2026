'use client';

import { useState, useEffect } from 'react';
import { BoltIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface VirtualLiquidityIndicatorProps {
    rentalId: string;
    isVirtual: boolean;
    latencyBound: number;
}

export function VirtualLiquidityIndicator({
    rentalId,
    isVirtual,
    latencyBound
}: VirtualLiquidityIndicatorProps) {
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isMaterialized, setIsMaterialized] = useState(false);

    useEffect(() => {
        if (!isVirtual) return;

        const interval = setInterval(() => {
            setTimeElapsed(prev => {
                const newTime = prev + 1;
                if (newTime >= latencyBound) {
                    setIsMaterialized(true);
                    clearInterval(interval);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isVirtual, latencyBound]);

    if (!isVirtual) return null;

    const progress = Math.min((timeElapsed / latencyBound) * 100, 100);
    const remainingSeconds = Math.max(latencyBound - timeElapsed, 0);

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-violet-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200 ring-2 ring-white/10 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <BoltIcon className="h-6 w-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight leading-none">
                            VIRTUAL LIQUIDITY
                        </h3>
                        <div className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.2em] mt-1">
                            Powered by TLVM Shadow Proofs
                        </div>
                    </div>
                </div>

                <div className="mb-6 space-y-2">
                    <p className="text-sm font-medium text-indigo-100 leading-relaxed">
                        Using <span className="text-amber-300 font-bold decoration-dotted underline underline-offset-4">JLVM Matrix</span> for instant access while
                        assets bridge from Arbitrum Sepolia in the background.
                    </p>
                </div>

                {/* Progress System */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-0.5">
                                Materialization Progress
                            </div>
                            <div className="text-2xl font-black tabular-nums">
                                {progress.toFixed(0)}%
                            </div>
                        </div>
                        <div className="text-right">
                            {isMaterialized ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm animate-pulse">
                                    <CheckCircleIcon className="h-5 w-5" />
                                    FULLY ATOMIC
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-indigo-200 font-bold text-sm">
                                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    {remainingSeconds}s remaining
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="h-4 bg-white/10 rounded-full p-1 overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-amber-300 rounded-full transition-all duration-1000 relative"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Pulsing Highlight */}
                            {!isMaterialized && (
                                <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/40 blur-sm animate-shimmer"></div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Verification Badge */}
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-[9px] font-bold text-indigo-400 uppercase">State Proof</div>
                            <div className="text-xs font-mono font-bold text-indigo-200">VERIFIED</div>
                        </div>
                        <div className="text-center border-l border-white/10 pl-4">
                            <div className="text-[9px] font-bold text-indigo-400 uppercase">Latency</div>
                            <div className="text-xs font-mono font-bold text-indigo-200">14ms</div>
                        </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${isMaterialized ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-black'
                        }`}>
                        {isMaterialized ? 'OBSERVED' : 'VIRTUAL'}
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite ease-out;
        }
      `}</style>
        </div>
    );
}
