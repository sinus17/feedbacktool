# URL Shortener - Quick Start Guide

## 🚀 Quick Deployment

Run the automated deployment script:

```bash
./deploy-url-shortener.sh
```

This will:
1. ✅ Create database tables
2. ✅ Deploy edge functions
3. ✅ Build the frontend

## 🌐 Domain Setup (One-time)

### In Cloudflare (swipe.fm DNS):
1. Go to DNS settings
2. Add CNAME record:
   - **Name:** `@` (root domain)
   - **Target:** `serene-faloodeh-c87125.netlify.app`
   - **Proxy:** ⚠️ **DNS only** (grey cloud, NOT orange)

### In Netlify:
1. Site Settings → Domain Management
2. Add custom domain: `swipe.fm`
3. Verify ownership
4. Enable HTTPS

## 📝 Creating Your First Short Link

1. Login to tool.swipeup-marketing.com
2. Click **"URL Shortener"** in sidebar
3. Click **"Create Short Link"**
4. Fill in:
   - Short code: `test` (will create swipe.fm/test)
   - Destination: `https://example.com`
5. Click **"Create"**
6. Copy and share: `https://swipe.fm/test`

## 🎯 Usage Examples

### Marketing Campaign
- Short code: `summer-sale`
- URL: `swipe.fm/summer-sale`
- Destination: Your campaign landing page

### Social Media
- Short code: `instagram-bio`
- URL: `swipe.fm/instagram-bio`
- Destination: Your link tree or main site

### Event Registration
- Short code: `concert-2024`
- URL: `swipe.fm/concert-2024`
- Destination: Event registration form

## 📊 Features

- ✅ Unlimited short URLs (no 10 redirect limit!)
- ✅ Click tracking & analytics
- ✅ Enable/disable links
- ✅ Custom titles & descriptions
- ✅ Copy to clipboard
- ✅ Real-time click counts

## 🔧 Manual Deployment Commands

If you prefer manual deployment:

```bash
# 1. Database migration
psql "postgresql://postgres.wrlgoxbzlngdtomjhvnz:datenbankpasswort@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/20241204_create_url_shortener.sql

# 2. Deploy edge functions
supabase functions deploy redirect-short-url --no-verify-jwt
supabase functions deploy manage-short-urls --no-verify-jwt
supabase functions deploy short-url-analytics --no-verify-jwt

# 3. Build & deploy
npm run build
git add .
git commit -m "Add URL shortener feature"
git push
```

## ❓ Troubleshooting

**Link not redirecting?**
- Check if edge function is deployed: `supabase functions list`
- Verify DNS propagation (can take up to 48 hours)
- Check link is active in admin panel

**Can't create link?**
- Ensure short code only uses letters, numbers, hyphens, underscores
- Check if short code is already taken
- Verify you're logged in

**Domain not working?**
- Ensure Cloudflare DNS is set to "DNS only" (grey cloud)
- Verify Netlify has swipe.fm added as custom domain
- Wait for DNS propagation

## 📚 Full Documentation

See `URL_SHORTENER_SETUP.md` for complete documentation.

## 🎉 You're Ready!

Your URL shortener is now set up and ready to use. Create unlimited short links and track their performance!
