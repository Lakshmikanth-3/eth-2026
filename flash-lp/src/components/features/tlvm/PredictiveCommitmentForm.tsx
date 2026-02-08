'use client';

import { useState } from 'react';
import { InformationCircleIcon, BoltIcon } from '@heroicons/react/24/solid';

interface PredictiveCommitmentFormProps {
    positionId: string;
    duration: number;
    onCommitmentChange: (commitment: CommitmentData | null) => void;
}

interface CommitmentData {
    predictedAmount: number;
    predictedVolume: number;
    predictedDuration: number;
    zkProof: string;
    confidenceScore: number;
}

export function PredictiveCommitmentForm({
    positionId,
    duration,
    onCommitmentChange
}: PredictiveCommitmentFormProps) {
    const [enableCommitment, setEnableCommitment] = useState(false);
    const [predictedVolume, setPredictedVolume] = useState('');
    const [confidenceScore, setConfidenceScore] = useState(80);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleEnableCommitment = async (enabled: boolean) => {
        setEnableCommitment(enabled);

        if (!enabled) {
            onCommitmentChange(null);
            return;
        }

        setIsGenerating(true);
        // Simulate ZK proof generation
        setTimeout(() => {
            onCommitmentChange({
                predictedAmount: 1000000,
                predictedVolume: parseFloat(predictedVolume) || 0,
                predictedDuration: duration,
                zkProof: "0x123...mock_zk_proof",
                confidenceScore: confidenceScore
            });
            setIsGenerating(false);
        }, 2000);
    };

    const potentialDiscount = calculatePotentialDiscount(confidenceScore);

    return (
        <div className={`rounded-2xl border-2 p-6 transition-all ring-offset-2 ${enableCommitment
                ? 'bg-violet-50 border-violet-200'
                : 'bg-gray-50 border-gray-100'
            }`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <BoltIcon className={`h-6 w-6 ${enableCommitment ? 'text-violet-600' : 'text-gray-400'}`} />
                        <h3 className={`text-lg font-bold ${enableCommitment ? 'text-violet-900' : 'text-gray-700'}`}>
                            Predictive Commitment
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500 max-w-sm">
                        Commit to your usage pattern with ZK proof and earn rewards for accuracy.
                    </p>
                </div>

                <button
                    onClick={() => handleEnableCommitment(!enableCommitment)}
                    className={`px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${enableCommitment
                            ? 'bg-violet-600 text-white hover:bg-violet-700 ring-2 ring-violet-300'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-violet-300'
                        }`}
                >
                    {enableCommitment ? 'ENABLED' : 'ENABLE'}
                </button>
            </div>

            {enableCommitment && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Predicted Volume */}
                    <div>
                        <label className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-2 block">
                            PREDICTED SWAP VOLUME (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                                type="number"
                                value={predictedVolume}
                                onChange={(e) => setPredictedVolume(e.target.value)}
                                placeholder="2,000,000"
                                className="w-full border-2 border-violet-200 rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-violet-900 focus:outline-none focus:border-violet-500 shadow-inner bg-white"
                            />
                        </div>
                    </div>

                    {/* Confidence Score */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-violet-700 uppercase tracking-widest">
                                CONFIDENCE SCORE
                            </label>
                            <span className="text-sm font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                {confidenceScore}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="100"
                            value={confidenceScore}
                            onChange={(e) => setConfidenceScore(Number(e.target.value))}
                            className="w-full accent-violet-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase mt-1">
                            <span>Riskier / Higher Reward</span>
                            <span>Safer / Lower Reward</span>
                        </div>
                    </div>

                    {/* Potential Discount Card */}
                    <div className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <InformationCircleIcon className="h-5 w-5 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                                Projected Reward
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-emerald-600">Up to {potentialDiscount}%</span>
                            <span className="text-xs text-gray-400 font-semibold">CASHBACK IN ETH</span>
                        </div>
                        <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Accuracy Requirement</span>
                                <span className="font-bold text-gray-900">&le; 5% deviation</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: '85%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* ZK Proof Status */}
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${isGenerating ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                        }`}>
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                                <span className="text-sm font-bold text-amber-700">Encrypting prediction via ZK Proof...</span>
                            </>
                        ) : (
                            <>
                                <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs ring-4 ring-emerald-100">
                                    ✓
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-emerald-800 tracking-tight">ZK Commitment Locked</div>
                                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Hash: 0x51c9...d063</div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function calculatePotentialDiscount(confidence: number): number {
    if (confidence >= 95) return 20;
    if (confidence >= 90) return 15;
    if (confidence >= 80) return 12;
    if (confidence >= 70) return 10;
    return 8;
}
