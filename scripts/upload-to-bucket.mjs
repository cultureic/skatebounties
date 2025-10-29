import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { createClient } from '@supabase/supabase-js'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { dir: '', bucket: 'skateordie', prefix: '' }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--dir=')) out.dir = a.slice(6)
    else if (a === '--dir') out.dir = args[++i]
    else if (a.startsWith('--bucket=')) out.bucket = a.slice(9)
    else if (a === '--bucket') out.bucket = args[++i]
    else if (a.startsWith('--prefix=')) out.prefix = a.slice(9)
    else if (a === '--prefix') out.prefix = args[++i]
  }
  if (!out.dir) throw new Error('Usage: pnpm run storage:upload --dir ./path [--bucket skateordie] [--prefix folder/]')
  return out
}

async function ensureBucket(client, bucket) {
  try {
    const { data, error } = await client.storage.getBucket(bucket)
    if (data) return
    if (error && !error.message?.includes('not found')) {
      // proceed to create if not found
    }
    const { error: createErr } = await client.storage.createBucket(bucket, { public: true })
    if (createErr && !createErr.message?.includes('already exists')) throw createErr
  } catch (e) {
    // If using anon key without permission, this may fail – uploads may still work if bucket exists
    console.warn('Bucket check/create skipped:', e.message)
  }
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile()) yield full
  }
}

async function main() {
  const { dir, bucket, prefix } = parseArgs()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey
  if (!url || !key) throw new Error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL and ANON or SUPABASE_SERVICE_ROLE)')

  const supabase = createClient(url, key)

  await ensureBucket(supabase, bucket)

  let count = 0
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).replace(/\\/g, '/')
    const destPath = (prefix ? `${prefix.replace(/\/$/, '')}/` : '') + rel
    const contentType = mime.getType(file) || 'application/octet-stream'
    const buf = fs.readFileSync(file)

    const { error } = await supabase.storage.from(bucket).upload(destPath, buf, {
      upsert: true,
      contentType,
    })
    if (error) throw error
    count++
    process.stdout.write(`Uploaded: ${destPath}\n`)
  }

  console.log(`Done. Uploaded ${count} file(s) to bucket '${bucket}'.`)
}

main().catch((e) => {
  console.error('Upload failed:', e.message)
  process.exit(1)
})
