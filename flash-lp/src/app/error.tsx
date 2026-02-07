'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global error:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-border p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                    Something went wrong!
                </h2>
                <p className="text-text-secondary mb-6">
                    {error.message || 'An unexpected error occurred'}
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-xl transition-all"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="text-sm text-primary hoverunderline"
                    >
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
