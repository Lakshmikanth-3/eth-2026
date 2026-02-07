import numeral from 'numeral'
// ✅ Removed unused import: formatDistanceToNow

export function formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value

    // ✅ Fixed: Handle invalid numbers
    if (isNaN(num) || !isFinite(num)) {
        return '$0.00'
    }

    return numeral(num).format('$0,0.00')
}

export function formatLargeCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value

    // ✅ Fixed: Handle invalid numbers
    if (isNaN(num) || !isFinite(num)) {
        return '$0'
    }

    if (num >= 1000000) {
        return numeral(num).format('$0.0a').toUpperCase()
    }
    return numeral(num).format('$0,0')
}

export function formatDuration(seconds: number): string {
    // ✅ Fixed: Ensure integer to prevent decimal seconds
    const totalSecs = Math.floor(seconds)
    const hours = Math.floor(totalSecs / 3600)
    const minutes = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
}

export function truncateAddress(address: string): string {
    // ✅ Fixed: Handle short or invalid addresses
    if (!address || address.length < 10) {
        return address || ''
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTimeRemaining(endTime: number): string {
    const now = Date.now()
    const diff = endTime - now

    if (diff <= 0) return 'Ended'

    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)

    if (hours > 0) return `${hours}h ${minutes}m remaining`
    return `${minutes}m remaining`
}
