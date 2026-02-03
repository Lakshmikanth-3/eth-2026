# Flash LP - Liquidity Rental Marketplace

Flash LP enables protocols to rent Uniswap v4 LP positions by the second using Yellow Network state channels.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd flash-lp
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Get a WalletConnect Project ID from [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/)

5. Update `.env.local` with your project ID

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

Build for production:
```bash
npm run build
npm start
```

## 📁 Project Structure

```
flash-lp/
├── src/
│   ├── app/              # Next.js pages and API routes
│   │   ├── api/          # Backend API endpoints
│   │   ├── error.tsx     # Global error boundary
│   │   └── not-found.tsx # Custom 404 page
│   ├── components/       # React components (TBD)
│   ├── lib/              # Utility functions
│   │   ├── formatting.ts # Currency/time formatting
│   │   ├── utils.ts      # Helper utilities
│   │   ├── wagmi.ts      # Web3 configuration
│   │   └── contracts.ts  # Smart contract ABIs
│   ├── types/            # TypeScript type definitions
│   └── middleware.ts     # Rate limiting & security
├── public/               # Static assets
└── package.json
```

## 🔧 API Endpoints

### GET /api/positions/available
Get available LP positions for rent.

**Query Parameters:**
- `chain` (optional): Filter by chain (arbitrum, base, optimism)

**Example:**
```bash
curl http://localhost:3000/api/positions/available?chain=arbitrum
```

**Response:**
```json
[
  {
    "id": "1",
    "poolName": "USDC/ETH",
    "token0": "USDC",
    "token1": "ETH",
    "liquidity": 1000000,
    "pricePerSecond": 0.058,
    "pricePerHour": 208.80,
    "chain": "arbitrum",
    "available": true,
    "apr": 24.5
  }
]
```

### GET /api/rentals/active
Get active rentals for a user.

**Query Parameters:**
- `address` (optional): Ethereum address (0x...)

**Example:**
```bash
curl "http://localhost:3000/api/rentals/active?address=0x1234567890123456789012345678901234567890"
```

## 🛡️ Security

- **Rate limiting**: 100 requests/minute per IP (disabled in development)
- **Input validation**: All API parameters validated
- **Ethereum address validation**: Regex pattern matching
- **Security headers**: XSS protection, frame options, CSP
- **Error boundaries**: Graceful error handling throughout app

## 🧪 Testing

Run TypeScript check:
```bash
npx tsc --noEmit
```

Run linter:
```bash
npm run lint
```

Test API endpoints:
```bash
# Test positions
curl http://localhost:3000/api/positions/available

# Test with chain filter
curl http://localhost:3000/api/positions/available?chain=arbitrum

# Test rentals
curl http://localhost:3000/api/rentals/active
```

## 🏗️ Technology Stack

- **Framework**: Next.js 14.2.5 (App Router)
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1
- **Web3**: wagmi 2.5.7, viem 2.7.15, RainbowKit 2.0.2
- **State Management**: TanStack React Query 5.20.5
- **UI Libraries**: Framer Motion, React Hot Toast, Phosphor Icons
- **Utilities**: date-fns, numeral, clsx, tailwind-merge

## 📝 License

MIT

## 🤝 Contributing

This is a hackathon project for ETH HackMoney 2026.

## 🔗 Links

- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)

## ⚠️ Production Checklist

Before deploying to production:

- [ ] Replace `.env.local` WalletConnect ID with real one
- [ ] Set `NEXT_PUBLIC_ENABLE_TESTNETS=false`
- [ ] Implement real smart contract integration
- [ ] Add comprehensive test suite
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure production database
- [ ] Enable HTTPS/SSL
- [ ] Review and optimize security headers
- [ ] Implement proper logging
- [ ] Set up CI/CD pipeline
