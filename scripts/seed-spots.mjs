import 'dotenv/config'
import { Client } from 'pg'

const spots = [
  {
    title: 'Parque México Ledge Line',
    description: 'Smooth marble ledges and flatground in Condesa. Watch for pedestrians.',
    latitude: 19.412997,
    longitude: -99.171599,
    address: 'Av. México s/n, Hipódromo',
    city: 'Mexico City',
    country: 'MX',
    spot_type: 'ledge',
    difficulty: 2,
    surface_type: 'marble',
    accessibility: 'public',
    photos: [],
  },
  {
    title: 'Plaza de la República 10‑Stair',
    description: 'Big set by Monumento a la Revolución. Best on weekends early morning.',
    latitude: 19.436329,
    longitude: -99.154911,
    address: 'Plaza de la República',
    city: 'Mexico City',
    country: 'MX',
    spot_type: 'stairs',
    difficulty: 4,
    surface_type: 'concrete',
    accessibility: 'public',
    photos: [],
  },
  {
    title: 'Parque La Mexicana Rails',
    description: 'Handrails and long banks; security varies. Smooth paths.',
    latitude: 19.360947,
    longitude: -99.286476,
    address: 'Av. Luis Barragán 505, Santa Fe',
    city: 'Mexico City',
    country: 'MX',
    spot_type: 'rail',
    difficulty: 3,
    surface_type: 'concrete',
    accessibility: 'public',
    photos: [],
  },
]

async function main() {
  const connStr = process.env.DIRECT_URL
  if (!connStr) throw new Error('DIRECT_URL not set')
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } })
  await client.connect()

  // Create or get a demo user
  const wallet = '0xseed000000000000000000000000000000000000'
  const resUser = await client.query(
    `insert into public.users (wallet_address) values ($1)
     on conflict (wallet_address) do update set wallet_address = excluded.wallet_address
     returning id`,
    [wallet],
  )
  const userId = resUser.rows[0].id

  for (const s of spots) {
    await client.query(
      `insert into public.spots (
        creator_id, title, description, location, latitude, longitude, address,
        city, country, spot_type, difficulty, surface_type, accessibility, photos
      ) values (
        $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $5, $4, $6,
        $7, $8, $9, $10, $11, $12, $13
      ) on conflict do nothing`,
      [
        userId,
        s.title,
        s.description,
        s.longitude,
        s.latitude,
        s.address,
        s.city,
        s.country,
        s.spot_type,
        s.difficulty,
        s.surface_type,
        s.accessibility,
        JSON.stringify(s.photos),
      ],
    )
  }

  await client.end()
  console.log('Seeded demo spots in Mexico City')
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
