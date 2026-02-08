'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

interface TemporalCurveChartProps {
    positionId: string;
    duration: number;
    liquidity: number;
}

export function TemporalCurveChart({
    positionId,
    duration,
    liquidity
}: TemporalCurveChartProps) {
    const [curveData, setCurveData] = useState<any[]>([]);

    useEffect(() => {
        // Generate temporal price curve data
        const data = [];
        const steps = 50; // Increased steps for smoothness
        const dt = duration / steps;

        for (let i = 0; i <= steps; i++) {
            const t = i * dt;
            const price = calculateTemporalPrice(t, liquidity);

            data.push({
                time: Number((t / 3600).toFixed(2)), // Convert to hours
                price: Number(price.toFixed(8)),
                volatility: getVolatility(t),
                demand: getDemand(t)
            });
        }

        setCurveData(data);
    }, [positionId, duration, liquidity]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Temporal Pricing Curve</h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                            dataKey="time"
                            label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5 }}
                            tick={{ fontSize: 12, fill: '#666' }}
                        />
                        <YAxis
                            label={{ value: 'Price (ETH/sec)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            tick={{ fontSize: 12, fill: '#666' }}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={false}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">TIME DECAY</div>
                    <div className="text-sm font-bold text-gray-900 italic">e^(-λt)</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">VOLATILITY</div>
                    <div className="text-sm font-bold text-gray-900">√(1 + σ²)</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">DEMAND</div>
                    <div className="text-sm font-bold text-gray-900">1 + tanh(δ)</div>
                </div>
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-500 mb-1">
                TIME: <span className="font-semibold text-gray-900">{data.time}h</span>
            </div>
            <div className="text-sm font-bold text-violet-600 mb-2">
                {data.price} ETH/sec
            </div>
            <div className="space-y-1">
                <div className="text-xs text-gray-500 flex justify-between gap-4">
                    <span>Volatility:</span>
                    <span className="font-medium text-gray-800">{data.volatility.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-gray-500 flex justify-between gap-4">
                    <span>Demand:</span>
                    <span className="font-medium text-gray-800">{data.demand.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

function calculateTemporalPrice(t: number, liquidity: number): number {
    const DECAY_RATE = 0.0001;
    const basePrice = 0.000058; // ETH per second

    // Time decay
    const decay = Math.exp(-DECAY_RATE * (t / 3600));

    // Volatility (mock - would come from oracle)
    const volatility = 0.15; // 15%
    const volMultiplier = Math.sqrt(1 + volatility * volatility);

    // Demand (mock - would come from demand calculator)
    const demand = 0.5;
    const demandMultiplier = 1 + Math.tanh(demand);

    // Liquidity discount
    const liquidityFactor = 1 / (1 + liquidity / 1e12);

    return basePrice * decay * volMultiplier * demandMultiplier * liquidityFactor;
}

function getVolatility(t: number): number {
    // Mock volatility that varies over time
    return 15 + 5 * Math.sin(t / 3600);
}

function getDemand(t: number): number {
    // Mock demand that varies over time
    return 0.3 + 0.4 * Math.sin(t / 1800);
}
