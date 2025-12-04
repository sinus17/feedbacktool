# Supabase Edge Functions

These are Deno-based edge functions that run on Supabase's infrastructure.

## ⚠️ TypeScript Errors in IDE

You may see TypeScript errors in these files such as:
- `Cannot find module 'https://esm.sh/@supabase/supabase-js@2.39.7'`
- `Cannot find name 'Deno'`
- `Parameter 'req' implicitly has an 'any' type`

**These errors are expected and can be safely ignored.**

### Why?

These files run in a **Deno runtime**, not Node.js:
- Uses ESM URL imports (`https://esm.sh/...`)
- Uses Deno global objects (`Deno.serve`, `Deno.env`)
- Different TypeScript configuration than your main app

Your IDE validates them as regular TypeScript files, causing false errors.

### Verification

The functions work correctly as evidenced by:
- ✅ Successful deployment: `supabase functions deploy`
- ✅ Production runtime: They execute without errors
- ✅ Proper responses: API calls return expected data

## Deployed Functions

1. **redirect-short-url** - Handles 301 redirects from swipe.fm/*
2. **manage-short-urls** - CRUD API for managing short links
3. **short-url-analytics** - Click tracking and analytics

## Deployment

```bash
supabase functions deploy redirect-short-url --no-verify-jwt
supabase functions deploy manage-short-urls --no-verify-jwt
supabase functions deploy short-url-analytics --no-verify-jwt
```

## Configuration

These functions are excluded from TypeScript checking in:
- `tsconfig.json` - Excludes `supabase/functions/**/*`
- `.vscode/settings.json` - Excludes from file watcher

This prevents IDE errors while maintaining functionality.
