#!/bin/bash

# SkateBounties Database Setup Script
# This script sets up the Supabase database schema

set -e

echo "🛹 Setting up SkateBounties database..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DIRECT_URL" ]; then
    echo -e "${RED}Error: DIRECT_URL environment variable is not set${NC}"
    echo "Please set it in your .env.local file or export it:"
    echo 'export DIRECT_URL="postgresql://postgres.gjoetfgqbkmlacfhwzot:wguhAFTtioaYmrVa@aws-1-us-east-1.pooler.supabase.com:5432/postgres"'
    exit 1
fi

# Method 1: Using psql (if installed)
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ psql found${NC}"
    echo "Running migration..."
    psql "$DIRECT_URL" -f supabase/migrations/001_skatebounties_schema.sql
    echo -e "${GREEN}✓ Database schema created successfully!${NC}"
    exit 0
fi

# Method 2: Using Supabase CLI (if installed)
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓ Supabase CLI found${NC}"
    echo "Running migration via Supabase CLI..."
    supabase db push
    echo -e "${GREEN}✓ Database schema created successfully!${NC}"
    exit 0
fi

# Method 3: Instructions for manual setup
echo -e "${YELLOW}Neither psql nor Supabase CLI found.${NC}"
echo ""
echo "Please choose one of these options:"
echo ""
echo "Option 1: Install PostgreSQL client"
echo "  brew install postgresql"
echo "  Then run: ./scripts/setup-database.sh"
echo ""
echo "Option 2: Install Supabase CLI"
echo "  brew install supabase/tap/supabase"
echo "  supabase login"
echo "  supabase link --project-ref gjoetfgqbkmlacfhwzot"
echo "  supabase db push"
echo ""
echo "Option 3: Manual setup via Supabase Dashboard"
echo "  1. Go to: https://supabase.com/dashboard/project/gjoetfgqbkmlacfhwzot/editor"
echo "  2. Click SQL Editor"
echo "  3. Create a new query"
echo "  4. Copy the contents of: supabase/migrations/001_skatebounties_schema.sql"
echo "  5. Paste and run"
echo ""
exit 1
