import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (use Redis in production)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Clean old entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    // ✅ Fixed: Convert Map iterator to array for compatibility
    for (const [key, value] of Array.from(rateLimit.entries())) {
        if (value.resetTime < now) {
            rateLimit.delete(key)
        }
    }
}, 300000)

export function middleware(request: NextRequest) {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
        return NextResponse.next()
    }

    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()

    // Initialize or reset rate limit for this IP
    if (!rateLimit.has(ip) || rateLimit.get(ip)!.resetTime < now) {
        rateLimit.set(ip, { count: 0, resetTime: now + 60000 }) // 1 minute window
    }

    const limit = rateLimit.get(ip)!
    limit.count++

    // 100 requests per minute per IP
    if (limit.count > 100) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429, headers: { 'Retry-After': '60' } }
        )
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
