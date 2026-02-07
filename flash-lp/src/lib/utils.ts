import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function calculateRentalCost(
    pricePerSecond: number,
    durationSeconds: number
): number {
    // ✅ Fixed: Validate inputs
    if (pricePerSecond < 0 || durationSeconds < 0) {
        throw new Error('Price and duration must be positive')
    }
    if (!isFinite(pricePerSecond) || !isFinite(durationSeconds)) {
        throw new Error('Invalid price or duration')
    }
    return pricePerSecond * durationSeconds
}

export function calculateCollateral(rentalCost: number): number {
    // ✅ Fixed: Validate input
    if (rentalCost < 0) {
        throw new Error('Rental cost cannot be negative')
    }
    if (!isFinite(rentalCost) || isNaN(rentalCost)) {
        throw new Error('Invalid rental cost')
    }
    return rentalCost * 1.2 // 120% collateral
}

export function calculatePricePerHour(pricePerSecond: number): number {
    return pricePerSecond * 3600
}
