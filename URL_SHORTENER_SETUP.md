# URL Shortener Setup Guide

This document explains how to set up and use the URL shortener feature for the **swipe.fm** domain.

## Overview

The URL shortener allows you to create short, memorable links using the swipe.fm domain that redirect to any destination URL. This bypasses Cloudflare's 10 redirect limit by using Supabase Edge Functions.

## Architecture

```
User visits swipe.fm/abc
    ↓
Netlify (swipe.fm domain)
    ↓
Supabase Edge Function (redirect-short-url)
    ↓
Database lookup
    ↓
301 Redirect to destination URL
```

## Setup Instructions

### 1. Run Database Migration

First, apply the database migration to create the necessary tables:

```bash
cd /Users/philipplutzenburger/feedbacktool/feedbacktool
supabase db push
```

Or manually run the migration file:
```bash
psql "postgresql://postgres.wrlgoxbzlngdtomjhvnz:datenbankpasswort@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/20241204_create_url_shortener.sql
```

This creates:
- `short_urls` table - stores short URL mappings
- `short_url_clicks` table - tracks click analytics
- RLS policies for security
- Triggers for auto-updating timestamps and click counts

### 2. Deploy Supabase Edge Functions

Deploy the three edge functions:

```bash
# Deploy redirect function (handles the actual redirects)
supabase functions deploy redirect-short-url --no-verify-jwt

# Deploy management function (CRUD operations)
supabase functions deploy manage-short-urls --no-verify-jwt

# Deploy analytics function (click tracking)
supabase functions deploy short-url-analytics --no-verify-jwt
```

**Important:** Use `--no-verify-jwt` flag as per your user rules.

### 3. Configure Cloudflare DNS

Add the swipe.fm domain to your Netlify site:

1. **In Cloudflare:**
   - Go to DNS settings for swipe.fm
   - Add a CNAME record:
     - Name: `@` (or leave blank for root domain)
     - Target: `serene-faloodeh-c87125.netlify.app` (your Netlify site)
     - Proxy status: DNS only (grey cloud) - **Important!**

2. **In Netlify:**
   - Go to Site Settings → Domain Management
   - Click "Add custom domain"
   - Enter: `swipe.fm`
   - Verify domain ownership
   - Enable HTTPS (Netlify will provision SSL certificate)

### 4. Deploy Updated Netlify Configuration

The `netlify.toml` file has been updated with the redirect rule. Deploy your site:

```bash
npm run build
# Then deploy via Netlify CLI or push to git
```

The key redirect rule in `netlify.toml`:
```toml
[[redirects]]
  from = "https://swipe.fm/*"
  to = "https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/redirect-short-url/:splat"
  status = 200
  force = true
```

## Usage

### Creating Short URLs

1. Navigate to **URL Shortener** in the sidebar
2. Click **"Create Short Link"**
3. Fill in the form:
   - **Short Code**: The path after swipe.fm/ (e.g., `my-campaign`)
   - **Destination URL**: Where the link should redirect
   - **Title** (optional): Internal name for the link
   - **Description** (optional): Notes about the link
4. Click **"Create Short Link"**

Your short URL will be: `https://swipe.fm/your-short-code`

### Managing Short URLs

From the URL Shortener page, you can:
- **Copy** short links to clipboard
- **View** click counts
- **Toggle** active/inactive status
- **Delete** short URLs
- **View** destination URLs

### Short Code Rules

- Only letters, numbers, hyphens (-), and underscores (_) allowed
- Case-insensitive (automatically converted to lowercase)
- Must be unique
- Examples: `campaign-2024`, `promo_link`, `special-offer`

### Click Tracking

Every click is automatically tracked with:
- Timestamp
- Referrer URL
- User agent
- IP address
- Geographic data (if available)

View analytics by clicking the chart icon next to any short URL.

## API Endpoints

### Create Short URL
```bash
POST /functions/v1/manage-short-urls
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "short_code": "my-link",
  "destination_url": "https://example.com",
  "title": "My Campaign",
  "description": "Campaign description"
}
```

### List Short URLs
```bash
GET /functions/v1/manage-short-urls
Authorization: Bearer <user-token>
```

### Update Short URL
```bash
PATCH /functions/v1/manage-short-urls
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "id": "uuid",
  "is_active": false
}
```

### Delete Short URL
```bash
DELETE /functions/v1/manage-short-urls?id=uuid
Authorization: Bearer <user-token>
```

### Get Analytics
```bash
GET /functions/v1/short-url-analytics?short_url_id=uuid
Authorization: Bearer <user-token>
```

## Database Schema

### short_urls
```sql
- id (uuid, primary key)
- short_code (varchar, unique)
- destination_url (text)
- title (varchar, nullable)
- description (text, nullable)
- created_by (uuid, foreign key to auth.users)
- created_at (timestamp)
- updated_at (timestamp)
- expires_at (timestamp, nullable)
- click_count (integer)
- is_active (boolean)
- metadata (jsonb)
```

### short_url_clicks
```sql
- id (uuid, primary key)
- short_url_id (uuid, foreign key to short_urls)
- clicked_at (timestamp)
- referrer (text)
- user_agent (text)
- ip_address (inet)
- country (varchar)
- city (varchar)
- metadata (jsonb)
```

## Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only manage their own short URLs
- Public read access for active short URLs (required for redirects)
- Click tracking is anonymous and doesn't require authentication

## Troubleshooting

### Short URL not redirecting

1. Check if the edge function is deployed:
   ```bash
   supabase functions list
   ```

2. Verify the short URL exists and is active:
   ```sql
   SELECT * FROM short_urls WHERE short_code = 'your-code';
   ```

3. Check edge function logs:
   ```bash
   supabase functions logs redirect-short-url
   ```

### Domain not resolving

1. Verify DNS settings in Cloudflare
2. Ensure CNAME is set to DNS only (not proxied)
3. Check Netlify domain configuration
4. Wait for DNS propagation (up to 48 hours)

### Permission errors

1. Verify RLS policies are applied
2. Check user authentication token
3. Ensure edge functions are deployed with `--no-verify-jwt`

## Limitations

- **No limit** on number of short URLs (unlike Cloudflare's 10 redirect limit)
- Short codes must be unique across all users
- Click tracking is best-effort (may miss some clicks in edge cases)
- Analytics are real-time but may have slight delays

## Future Enhancements

Potential features to add:
- QR code generation for short URLs
- Bulk import/export
- Custom domains beyond swipe.fm
- A/B testing with multiple destinations
- Link expiration dates
- Password-protected links
- Geographic targeting
- Device targeting (mobile vs desktop)

## Support

For issues or questions, contact the development team or check the Supabase logs for error details.
