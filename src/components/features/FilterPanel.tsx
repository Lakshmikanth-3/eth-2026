'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import { Funnel, MagnifyingGlass } from '@phosphor-icons/react'

interface FilterPanelProps {
    onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
    search: string
    chain: string
    sortBy: 'apr' | 'price' | 'liquidity'
    availableOnly: boolean
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        chain: 'all',
        sortBy: 'apr',
        availableOnly: true
    })

    const handleChange = (key: keyof FilterState, value: any) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const chains = ['all', 'arbitrum', 'base', 'optimism']
    const sortOptions = [
        { value: 'apr', label: 'Highest APR' },
        { value: 'price', label: 'Lowest Price' },
        { value: 'liquidity', label: 'Most Liquidity' },
    ]

    return (
        <Card className="sticky top-20">
            <div className="flex items-center gap-2 mb-6">
                <Funnel size={24} className="text-primary" />
                <h3 className="text-xl font-bold">Filters</h3>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <Input
                        placeholder="Search pools..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Chain Filter */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Chain</label>
                <div className="flex flex-wrap gap-2">
                    {chains.map((chain) => (
                        <button
                            key={chain}
                            onClick={() => handleChange('chain', chain)}
                            className="flex-1 min-w-[80px]"
                        >
                            <Badge
                                variant={chain !== 'all' ? chain as any : 'default'}
                                className={`w-full justify-center cursor-pointer transition-all ${filters.chain === chain
                                    ? 'ring-2 ring-primary scale-105'
                                    : 'opacity-60 hover:opacity-100'
                                    }`}
                            >
                                {chain === 'all' ? 'All' : chain.toUpperCase().slice(0, 3)}
                            </Badge>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sort */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Sort By</label>
                <select
                    value={filters.sortBy}
                    onChange={(e) => handleChange('sortBy', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Available Only */}
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="availableOnly"
                    checked={filters.availableOnly}
                    onChange={(e) => handleChange('availableOnly', e.target.checked)}
                    className="w-5 h-5 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary"
                />
                <label htmlFor="availableOnly" className="text-sm font-medium cursor-pointer">
                    Available positions only
                </label>
            </div>
        </Card>
    )
}
