import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
    children: ReactNode
    variant?: 'arbitrum' | 'base' | 'optimism' | 'available' | 'rented' | 'default'
    className?: string
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variants = {
        arbitrum: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        base: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
        optimism: 'bg-red-500/20 text-red-400 border-red-500/30',
        available: 'bg-green-500/20 text-green-400 border-green-500/30',
        rented: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        default: 'bg-surface-hover text-text-secondary border-border'
    }

    return (
        <span
            className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    )
}
