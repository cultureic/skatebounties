# 🛹 SkateBounties - Quick Start

## ✅ Database Setup Complete!

Your Supabase database is **LIVE** with:
- ✅ PostGIS enabled (geospatial queries)
- ✅ 10 tables created (users, spots, bounties, etc.)
- ✅ Row-level security configured
- ✅ Triggers & functions active

---

## 🚀 Next Step: Get Your Supabase Anon Key

1. **Go to:** https://supabase.com/dashboard/project/gjoetfgqbkmlacfhwzot/settings/api

2. **Copy the `anon` / `public` key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

3. **Update `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
   ```

---

## 🎯 Start the App

```bash
pnpm dev
```

Then visit: **http://localhost:3000/retro**

It will redirect to the map explorer automatically!

---

## 📱 What's Working Now

### ✅ Map Explorer (`/retro/map-explorer`)
- Interactive map with geolocation
- Find nearby skate spots
- Click markers to see spot details

### ✅ Spot Detail Pages (`/retro/spot/[id]`)
- Photo carousel
- Spot info (difficulty, type, surface)
- Active bounties list
- Vote on submissions (gasless!)

### ✅ Backend Complete
- All database tables
- All React hooks
- Smart contract integration
- Supabase client ready

---

## 🚧 What's Next (Quick UI Tasks)

Build these modals (all hooks are ready):

1. **Create Spot Modal** (2 hours)
   - Photo upload
   - Geolocation picker
   - Form fields

2. **Create Bounty Modal** (2 hours)
   - Trick selector
   - Reward amount
   - Payment integration

3. **Submit Trick Modal** (3 hours)
   - Video upload
   - Thumbnail generation
   - Submit to bounty

---

## 🔑 Environment Variables

Your `.env.local` should have:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gjoetfgqbkmlacfhwzot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-dashboard>
DATABASE_URL="postgresql://postgres.gjoetfgqbkmlacfhwzot:wguhAFTtioaYmrVa@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.gjoetfgqbkmlacfhwzot:wguhAFTtioaYmrVa@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Web3
NEXT_PUBLIC_CRYPTO_PROJECT_ID=99c605bd38372615f0c5ed082fc83b17

# Celo
CELO_ALFAJORES_RPC_URL="https://alfajores-forno.celo-testnet.org/"
DEPLOYER_PRIVATE_KEY="c19cd94ef6eed20269db45145de210409a2add6b5b075625f0cedf3b33bd58e0"

# Smart Contracts (deploy these)
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0xb64Ef5a4aB2Fe8D8d655DA5658b8305414883a92
NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=<deploy-with: npx hardhat run scripts/deploy-bounty-pool.js --network alfajores>

# Relayer (optional for gasless)
NEXT_PUBLIC_RELAYER_API_URL=http://localhost:3001
RELAYER_PRIVATE_KEY=<create-new-wallet>
```

---

## 🎨 Design System

The UI uses your exact spec:
- **Matte Asphalt** (#2B2B2B) - backgrounds
- **Signal Orange** (#FF4E00) - CTAs
- **Electric Cyan** (#00E0FF) - accents
- **Concrete Gray** (#888888) - surfaces
- **White Smoke** (#F5F5F5) - text

---

## 📚 Key Files

```
src/
├── app/retro/
│   ├── map-explorer/page.tsx    ← Main map view
│   └── spot/[id]/page.tsx       ← Spot details
├── hooks/
│   ├── useSpots.tsx             ← All spot operations
│   ├── useBounties.tsx          ← Bounty CRUD
│   └── useSubmissions.tsx       ← Voting & submissions
├── components/
│   ├── map/MapView.tsx          ← Leaflet map
│   └── submission/VoteButtons.tsx  ← Voting UI
└── lib/
    └── supabase.ts              ← Database client
```

---

## 🛠️ Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Deploy database (already done!)
node scripts/deploy-db.js

# Compile smart contracts
npx hardhat compile

# Deploy bounty contract
npx hardhat run scripts/deploy-bounty-pool.js --network alfajores

# Build for production
pnpm build
```

---

## 🐛 Troubleshooting

### Map not loading?
- Check browser console for errors
- Allow location permissions
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### Database errors?
- Check Supabase dashboard logs
- Verify RLS policies are active
- Ensure PostGIS extension is enabled

### Contract errors?
- Deploy bounty pool contract first
- Update `NEXT_PUBLIC_BOUNTY_POOL_ADDRESS`
- Check Alfajores testnet is selected in wallet

---

**Status:** 🟢 Backend Ready | 🟡 UI In Progress  
**Next:** Get anon key → Start dev server → Test map!

🛹 Let's go!
