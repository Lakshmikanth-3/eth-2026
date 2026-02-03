import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    onClick?: () => void
}

export default function Card({ children, className, hover = false, onClick }: CardProps) {
    return (
        <div
            className={cn(
                'bg-surface border border-border rounded-2xl p-6',
                'backdrop-blur-sm bg-opacity-80',
                hover && 'hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer hover:scale-[1.02]',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}
