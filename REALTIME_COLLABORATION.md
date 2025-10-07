# Real-Time Collaboration for Release Sheets

## Overview
Release sheets now support real-time collaborative editing. When multiple users or artists have the same release sheet open, they will see each other's changes in real-time.

## How It Works

### 1. **Auto-Save**
- Changes are automatically saved 1 second after the user stops typing
- The "Saved" indicator shows when the last save occurred

### 2. **Real-Time Updates**
- When one user saves changes, all other users viewing the same sheet receive the update immediately
- Updates are applied via Supabase real-time subscriptions
- The editor content is updated automatically without requiring a page refresh

### 3. **Smart Update Logic**
- Updates are **only applied when the editor is not focused** (i.e., when the user is not actively typing)
- This prevents content from being overwritten while someone is editing
- If a user is typing, they won't be interrupted by incoming updates

## Technical Implementation

### Database
- Real-time is enabled on the `release_sheets` table via Supabase publication
- See: `supabase/migrations/enable_realtime_release_sheets.sql`

### Frontend
- Real-time subscription is set up in `ReleaseSheetEditor.tsx`
- The subscription listens for UPDATE events on the specific release sheet
- When an update is received, it checks if the editor is focused before applying changes

### Console Logs
Look for these logs in the browser console:
- 🔴 `Setting up real-time subscription for sheet: [id]` - Subscription initialized
- 🔴 `Real-time update received: [payload]` - Update received from another user
- 🔴 `Applying real-time update to editor` - Update is being applied
- 🔴 `Skipping real-time update - editor is focused` - Update skipped because user is typing

## Testing Real-Time Collaboration

1. Open the same release sheet in two different browser windows/tabs
2. Make changes in one window (e.g., edit text, add content)
3. Wait for auto-save (1 second after stopping typing)
4. The changes should appear in the other window immediately

## Notes

- Real-time updates are **only enabled for release sheets**, not templates
- Templates are edited individually and don't require real-time collaboration
- The system is designed to be non-intrusive and won't interrupt active editing
