# SkateBounties — Find. Shred. Earn.

SkateBounties is a community-driven skateboarding platform to discover real-world spots, post trick bounties, and reward verified clips. It’s built with Next.js, TypeScript, Tailwind, Supabase (Postgres + Storage), and Privy for auth/wallets.

## Supported Platforms

Compatible Browsers (Firefox, Safari, Chrome, Edge)
Node.js 18.17 or later
MacOS, Windows (including WSL), and Linux are supported

## Features

- Map-first Spot Explorer (Locate nearby spots, Mexico City quick-jump)
- Create Spots (photo uploads to Supabase Storage)
- Bounties and Submissions (schema + hooks; on-chain hooks stubbed for now)
- Privy login (email or wallet), gated create actions
- Supabase migrations and Prisma schema

## Requirements

- node (18.17 or later)
- pnpm (latest)
- editor: VS code (recommended)
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL and DIRECT_URL (Postgres, used for migrations/Prisma)
- NEXT_PUBLIC_PRIVY_APP_ID (to enable Privy login)

## Get Project ID

You can get a project id for web3Modal **NEXT_PUBLIC_CRYPTO_PROJECT_ID** from [WalletConnect Docs](https://docs.walletconnect.com/web3modal/nextjs/about).

## Installation

For getting started with the template you have to follow the below procedure: Open project directory and run below command.

```sh
pnpm install

pnpm dev
```

This will start the server at http://localhost:3000.

## Available Scripts:

You can run below commands in the root folder for your need.

```sh
"clean": "rimraf \"{node_modules,.next,out.cache}\"",
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"prepare": "husky",
"test:supabase": "node scripts/test-supabase.mjs",
"db:apply": "node -r dotenv/config scripts/apply-supabase-sql.mjs",
"db:pull": "pnpm dlx prisma db pull && pnpm dlx prisma generate",
"db:seed:spots": "node -r dotenv/config scripts/seed-spots.mjs",
"storage:upload": "node -r dotenv/config scripts/upload-to-bucket.mjs"
```

## Stack

- Next.js 14, TypeScript, Tailwind CSS
- Supabase (Postgres, Storage), Prisma
- Privy (auth + wallets)
- React Query

## Migrations & Seeding

- Apply schema: `pnpm run db:apply`
- Introspect/generate Prisma: `pnpm run db:pull`
- Seed demo Mexico City spots: `pnpm run db:seed:spots`

## Storage Uploads

- Upload a folder to bucket `skateordie`: `pnpm run storage:upload --dir ./public --prefix assets/`

## Deployment

- Configure .env on your host (do not commit secrets).
- Set NEXT_PUBLIC_SUPABASE_URL/ANON, NEXT_PUBLIC_PRIVY_APP_ID, DATABASE_URL/DIRECT_URL.
- Deploy to Vercel or your platform of choice.

## Notes

- On-chain bounty interactions are stubbed; enable once contracts are ready.

## License

MIT

There are some basic requirements for our application so that support team can help you
quick such as,

1. Asking queries regarding feature that is already implemented in the application

2. Following recommended configuration, environments & server which you need to met first
   before you proceed with installation, deployment in your server to receive support.

3. [Support query need to be within Envato item support policy.](https://themeforest.net/page/item_support_policy)

4. You should maintain only one support ticket at a time. Creating multiple ticket can cause
   unexpected delays.

5. Ticket should provide as much details as possible related to the issue such as screenshot,
   video explanation, access, how to reproduce, environments, if any changes or customizations are made etc
   During working days our ticket response can take 24 hours to 48 hours depending on the
   [volume of tickets pending prior to your ticket. We follow Envato Item support policy https://themeforest.net/page/item_support_policy to provide standard support for our items](https://themeforest.net/page/item_support_policy)

**Please follow our official documentation for more details: https://criptic-doc.vercel.app/**
