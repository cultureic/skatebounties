import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

async function main() {
  const sqlDir = path.resolve(process.cwd(), 'supabase/migrations')
  const files = fs.readdirSync(sqlDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const connStr = process.env.DIRECT_URL
  if (!connStr) {
    console.error('DIRECT_URL not set')
    process.exit(1)
  }

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } })
  await client.connect()

  for (const file of files) {
    const p = path.join(sqlDir, file)
    const sql = fs.readFileSync(p, 'utf8')
    console.log('Applying', file)
    await client.query(sql)
  }

  await client.end()
  console.log('Migrations applied')
}

main().catch(e => { console.error('Migration failed:', e.message); process.exit(1) })
