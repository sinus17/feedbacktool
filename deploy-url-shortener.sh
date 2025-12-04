#!/bin/bash

# URL Shortener Deployment Script
# This script deploys all components of the URL shortener feature

set -e  # Exit on error

echo "🚀 Starting URL Shortener Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Run database migration
echo -e "${BLUE}Step 1: Running database migration...${NC}"
psql "postgresql://postgres.wrlgoxbzlngdtomjhvnz:datenbankpasswort@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/20241204_create_url_shortener.sql
echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# Step 2: Deploy Supabase Edge Functions
echo -e "${BLUE}Step 2: Deploying Supabase Edge Functions...${NC}"

echo "  Deploying redirect-short-url..."
supabase functions deploy redirect-short-url --no-verify-jwt
echo -e "${GREEN}  ✓ redirect-short-url deployed${NC}"

echo "  Deploying manage-short-urls..."
supabase functions deploy manage-short-urls --no-verify-jwt
echo -e "${GREEN}  ✓ manage-short-urls deployed${NC}"

echo "  Deploying short-url-analytics..."
supabase functions deploy short-url-analytics --no-verify-jwt
echo -e "${GREEN}  ✓ short-url-analytics deployed${NC}"

echo -e "${GREEN}✓ All edge functions deployed${NC}"
echo ""

# Step 3: Build and deploy frontend
echo -e "${BLUE}Step 3: Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

echo -e "${GREEN}🎉 URL Shortener deployment completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure swipe.fm domain in Cloudflare DNS"
echo "2. Add swipe.fm as custom domain in Netlify"
echo "3. Deploy to Netlify (git push or netlify deploy)"
echo ""
echo "See URL_SHORTENER_SETUP.md for detailed instructions."
