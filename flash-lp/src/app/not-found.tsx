import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
    return (
        <>
            <Header />
            <div className="min-h-screen bg-surface flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center">
                    <div className="text-8xl font-black text-primary mb-4">404</div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">
                        Page Not Found
                    </h2>
                    <p className="text-text-secondary mb-6">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-xl transition-all"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
            <Footer />
        </>
    )
}
