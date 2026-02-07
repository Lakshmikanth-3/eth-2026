import { Certificate } from '@phosphor-icons/react'

interface RentalNFTBadgeProps {
    rentalId?: bigint
    size?: 'sm' | 'md' | 'lg'
}

export default function RentalNFTBadge({ rentalId, size = 'md' }: RentalNFTBadgeProps) {
    if (!rentalId) return null

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    }

    const iconSizes = {
        sm: 14,
        md: 16,
        lg: 20
    }

    return (
        <div className={`inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg ${sizes[size]} font-medium`}>
            <Certificate size={iconSizes[size]} className="text-purple-400" weight="duotone" />
            <span className="text-purple-300">
                NFT #{rentalId.toString()}
            </span>
        </div>
    )
}
