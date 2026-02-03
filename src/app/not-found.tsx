import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="text-center max-w-md mx-auto px-6">
                <div className="text-6xl font-black text-primary mb-4">404</div>
                <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
                <p className="text-text-secondary mb-6">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-primary hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
                >
                    Return Home
                </Link>
            </div>
        </div>
    )
}
