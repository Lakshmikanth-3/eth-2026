'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error to monitoring service (e.g., Sentry)
        console.error('Global error caught:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="text-center max-w-md mx-auto px-6">
                <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
                <p className="text-text-secondary mb-6">
                    We encountered an unexpected error. Please try again.
                </p>
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
                >
                    Try again
                </button>
            </div>
        </div>
    )
}
