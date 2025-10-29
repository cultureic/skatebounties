#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function deployDatabase() {
  console.log('🛹 Deploying SkateBounties database schema...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_skatebounties_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Connect to database
    const client = await pool.connect();
    console.log('✅ Connected to Supabase\n');

    // Execute the migration
    console.log('📝 Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration complete!\n');
    console.log('📊 Database schema deployed:');
    console.log('  - users');
    console.log('  - spots (with PostGIS)');
    console.log('  - bounties');
    console.log('  - submissions');
    console.log('  - votes');
    console.log('  - comments');
    console.log('  - followers');
    console.log('  - notifications');
    console.log('  - activity_feed');
    console.log('  - trick_types');
    console.log('\n✨ SkateBounties is ready!\n');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Error deploying database:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your DIRECT_URL in .env.local');
    console.error('2. Ensure PostGIS extension is available on Supabase');
    console.error('3. Check Supabase logs in dashboard\n');
    process.exit(1);
  }
}

deployDatabase();
