# 🛹 SkateBounties Setup Guide

Complete setup instructions for the SkateBounties dApp.

## 📋 Prerequisites

- Node.js 18+ and pnpm
- MetaMask or compatible Web3 wallet
- Celo Alfajores testnet CELO (from faucet)
- Supabase account (free tier works)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gjoetfgqbkmlacfhwzot/editor)
2. Click "SQL Editor" in sidebar
3. Create "New query"
4. Copy contents of `supabase/migrations/001_skatebounties_schema.sql`
5. Paste and click "Run"
6. Get your Anon Key from Settings > API
7. Update `.env.local` with `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Option B: Using PostgreSQL CLI**

```bash
brew install postgresql
export DIRECT_URL="postgresql://postgres.gjoetfgqbkmlacfhwzot:wguhAFTtioaYmrVa@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
./scripts/setup-database.sh
```

**Option C: Using Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref gjoetfgqbkmlacfhwzot
supabase db push
```

### 3. Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Deploy to Alfajores testnet
npx hardhat run scripts/deploy-bounty-pool.js --network alfajores

# Copy the deployed address and update .env.local
# NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=0x...
```

### 4. Update Environment Variables

Get your Supabase Anon Key:
1. Go to https://supabase.com/dashboard/project/gjoetfgqbkmlacfhwzot/settings/api
2. Copy the `anon` / `public` key
3. Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=deployed-contract-address
```

### 5. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

---

## 🎨 Project Structure

```
skate/
├── contracts/              # Solidity smart contracts
│   ├── SkateBountyPool.sol # Main bounty contract with meta-txs
│   ├── TokenFactory.sol    # Token creation (existing)
│   └── abi/               # Generated ABIs
├── supabase/
│   └── migrations/        # Database schema migrations
├── src/
│   ├── app/              # Next.js 14 app router
│   │   ├── (modern)/    # Default theme
│   │   ├── retro/       # Retro theme
│   │   └── shared/      # Providers
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks
│   │   ├── useSkateBounty.tsx  # Smart contract interaction
│   │   └── useMetaMask.tsx     # Wallet connection
│   ├── lib/
│   │   └── supabase.ts  # Supabase client + helpers
│   ├── services/
│   │   └── relayer.ts   # Gasless transaction relayer
│   └── config/          # App configuration
└── scripts/             # Deployment & setup scripts
```

---

## 📦 Key Features

### ✅ Implemented

- **Gasless Transactions** - Meta-transaction support for voting/submitting
- **Geospatial Search** - PostGIS-powered nearby spot discovery
- **On-chain + Off-chain** - Smart contracts for escrow, Supabase for metadata
- **Multi-token Support** - CELO, cUSD, or any ERC20
- **Reputation System** - On-chain reputation tracking
- **Social Features** - Follow skaters, activity feed, notifications

### 🚧 To Build Next

1. **Map Explorer** - Interactive Mapbox with spot pins
2. **Spot Creation Flow** - Upload photos, geolocation picker
3. **Bounty Creation** - Token selection, trick dropdown
4. **Video Upload** - IPFS or Supabase Storage for clips
5. **Voting UI** - Upvote/downvote with gasless option
6. **Profile Dashboard** - User stats, earnings, clips
7. **Leaderboards** - Top skaters, spotters, fans

---

## 🔐 Environment Variables Reference

```bash
# Web3
NEXT_PUBLIC_CRYPTO_PROJECT_ID=      # WalletConnect project ID
CELO_ALFAJORES_RPC_URL=             # Celo RPC endpoint
DEPLOYER_PRIVATE_KEY=               # For contract deployment

# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key
DATABASE_URL=                        # Connection pooler URL
DIRECT_URL=                          # Direct database URL

# Smart Contracts
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=   # Existing token factory
NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=     # Deployed bounty pool

# Relayer (optional, for gasless txs)
NEXT_PUBLIC_RELAYER_API_URL=         # Relayer service URL
RELAYER_PRIVATE_KEY=                 # Relayer wallet key
```

---

## 🧪 Testing

### Test Smart Contracts

```bash
npx hardhat test
```

### Test Database Functions

```sql
-- In Supabase SQL Editor
SELECT * FROM find_nearby_spots(37.7749, -122.4194, 10);
```

### Test Frontend

```bash
pnpm build  # Check for TypeScript errors
pnpm lint   # Run ESLint
```

---

## 🌐 Network Info

### Celo Alfajores Testnet

- **Chain ID:** 44787
- **RPC:** https://alfajores-forno.celo-testnet.org/
- **Explorer:** https://alfajores.celoscan.io/
- **Faucet:** https://faucet.celo.org/alfajores

### Existing Contracts

- **TokenFactory:** `0xb64Ef5a4aB2Fe8D8d655DA5658b8305414883a92`
- **SkateBountyPool:** *Deploy using scripts/deploy-bounty-pool.js*

---

## 📚 Documentation

- [SMART_ACCOUNTS.md](./SMART_ACCOUNTS.md) - Meta-transaction architecture
- [WARP.md](./WARP.md) - Original project documentation
- [Smart Contract ABIs](./contracts/abi/) - Generated contract interfaces

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"

Make sure `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gjoetfgqbkmlacfhwzot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
```

### "Contract not initialized"

1. Deploy contract: `npx hardhat run scripts/deploy-bounty-pool.js --network alfajores`
2. Update `.env.local` with deployed address
3. Restart dev server

### Database connection errors

Check that:
- PostGIS extension is enabled in Supabase
- RLS policies are set up (migration script handles this)
- Your IP is allowed in Supabase dashboard (Settings > Database)

### MetaMask not connecting

1. Switch to Celo Alfajores network
2. Get testnet CELO from faucet
3. Refresh page and try again

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Connect GitHub repo to Vercel
# Add environment variables in Vercel dashboard
# Push to main branch → auto-deploy
```

### Smart Contracts (Mainnet)

```bash
# ⚠️ Only after thorough testing!
npx hardhat run scripts/deploy-bounty-pool.js --network celo
```

### Relayer Service

Deploy to Railway, Render, or AWS:
```bash
# Set up Node.js service
# Install dependencies
# Run: node scripts/relayer-service.js
# Fund relayer wallet with CELO
```

---

## 💡 Tips

- **Test on Alfajores first** - Always use testnet before mainnet
- **Monitor relayer balance** - Set up alerts when CELO runs low
- **Cache Supabase queries** - Use TanStack Query for better performance
- **Optimize images** - Compress photos before upload
- **Use batch operations** - Save gas with `batchVote`

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📞 Support

- **Issues:** GitHub Issues
- **Discord:** [Join our Discord](#)
- **Docs:** Check `SMART_ACCOUNTS.md` and `WARP.md`

---

Built with 🛹 for skaters by skaters
