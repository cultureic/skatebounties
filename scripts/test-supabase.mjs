import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    // dotenv/config already loaded .env, but ensure .env.local too
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) {
        const key = m[1]
        let val = m[2]
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (!(key in process.env)) process.env[key] = val
      }
    }
  }
}

function buildUrlFromTemplate(raw, passwordEnv) {
  if (!raw) return null
  const pwd = process.env[passwordEnv]
  if (!pwd) return { url: null, reason: `Missing env ${passwordEnv}` }
  const url = raw.replace('[YOUR-PASSWORD]', encodeURIComponent(pwd))
  return { url }
}

async function main() {
  loadEnvLocal()

  const { url: pooledUrl, reason: pooledReason } = buildUrlFromTemplate(process.env.DATABASE_URL, 'SUPABASE_DB_PASSWORD')
  const { url: directUrl, reason: directReason } = buildUrlFromTemplate(process.env.DIRECT_URL, 'SUPABASE_DB_PASSWORD')

  if (!pooledUrl || !directUrl) {
    console.error('Supabase DB password not set. Set SUPABASE_DB_PASSWORD and retry.')
    if (pooledReason) console.error('- ' + pooledReason)
    if (directReason) console.error('- ' + directReason)
    process.exit(1)
  }

  // Test pooled connection (read-only/pgbouncer)
  const pooled = new Client({ connectionString: pooledUrl, ssl: { rejectUnauthorized: false } })
  await pooled.connect()
  const r1 = await pooled.query('select now() as now, current_user as user')
  console.log('[pool] ok:', r1.rows[0])
  await pooled.end()

  // Test direct connection + extensions
  const direct = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } })
  await direct.connect()

  // Ensure extensions we rely on
  await direct.query('create extension if not exists postgis')
  await direct.query('create extension if not exists pgcrypto')

  // Check RPC and required tables
  const rpcCheck = await direct.query("select 1 from pg_proc where proname = 'find_nearby_spots' limit 1")
  console.log('[direct] rpc find_nearby_spots:', rpcCheck.rowCount ? 'present' : 'missing')

  const tables = await direct.query("select table_name from information_schema.tables where table_schema='public' and table_name in ('users','spots','bounties','submissions','votes') order by table_name")
  console.log('[direct] tables:', tables.rows.map(r => r.table_name))

  await direct.end()
}

main().catch((e) => {
  console.error('Supabase test failed:', e.message)
  process.exit(1)
})
