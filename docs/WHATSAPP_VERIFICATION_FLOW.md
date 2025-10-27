# WhatsApp Verification & Group Lookup Flow

## Overview
Implemented a WhatsApp-based verification system for the campaign submission form that:
1. Sends a verification code via WhatsApp
2. Verifies the entered code
3. Looks up all WhatsApp groups the user is a member of
4. Matches groups to artists in the feedback tool
5. Allows user to select which artist to create a campaign for

## Components

### 1. Edge Functions

#### `send-whatsapp-verification`
**Location**: `/supabase/functions/send-whatsapp-verification/index.ts`

**Purpose**: Sends a 6-digit verification code to a phone number via WhatsApp

**Input**:
```json
{
  "phone": "+49 123 456 7890",
  "code": "123456",
  "name": "Kunde"
}
```

**Output**:
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "messageId": "..."
}
```

**API Used**: WHAPI Cloud - `https://gate.whapi.cloud/messages/text`

#### `lookup-whatsapp-groups`
**Location**: `/supabase/functions/lookup-whatsapp-groups/index.ts`

**Purpose**: Checks all artist WhatsApp groups to see if the phone number is a member

**Input**:
```json
{
  "phone": "+49 123 456 7890"
}
```

**Output**:
```json
{
  "success": true,
  "artists": [
    {
      "id": "artist-uuid",
      "name": "Artist Name",
      "whatsapp_group_id": "120363376937486419@g.us",
      "whatsapp_group_name": "Artist Group"
    }
  ],
  "count": 1
}
```

**API Used**: WHAPI Cloud - `https://gate.whapi.cloud/groups/{groupId}`

**Process**:
1. Fetches all artists with `whatsapp_group_id` from database
2. For each artist, calls WHAPI to get group participants
3. Checks if the phone number matches any participant
4. Returns list of matching artists

### 2. Frontend Flow

#### Step 1.7: Phone Verification
**Location**: `/src/pages/NewCampaignSubmission.tsx`

**UI Elements**:
- Phone number input field
- "Code per WhatsApp senden" button
- Verification code input field (6 digits)
- "Weiter" button to verify code

**Functions**:

##### `sendWhatsAppVerification()`
- Generates a random 6-digit code
- Stores code in `formData.generated_code`
- Calls `send-whatsapp-verification` edge function
- Shows success toast

##### `verifyCode()`
- Compares entered code with generated code
- If match:
  - Sets `formData.is_phone_verified = true`
  - Calls `lookupArtistsByWhatsAppGroups()`
  - Shows success toast

##### `lookupArtistsByWhatsAppGroups()`
- Calls `lookup-whatsapp-groups` edge function
- Receives list of artists user is associated with
- Sets `associatedArtists` state
- Shows artist selection UI

#### Artist Selection UI
Once verified, user sees:
- List of artists they're a member of (via WhatsApp groups)
- "Auswählen" button for each artist
- "Neuen Künstler & Release anlegen" button

**Actions**:
- `selectExistingArtist(artist)`: Pre-fills form with artist data, proceeds to Step 2
- `createNewArtist()`: Proceeds to Step 2 with empty form

## Database Schema

### Artists Table
The `artists` table must have a `whatsapp_group_id` column:

```sql
ALTER TABLE artists ADD COLUMN IF NOT EXISTS whatsapp_group_id TEXT;
```

**Column already exists** ✅

## Environment Variables

Required in Supabase Edge Functions:

```env
VITE_WHAPI_TOKEN=your_whapi_token_here
```

## WHAPI API Endpoints Used

### 1. Send Message
```
POST https://gate.whapi.cloud/messages/text
Authorization: Bearer {WHAPI_TOKEN}

Body:
{
  "to": "491234567890@c.us",
  "body": "Message text",
  "preview_url": false
}
```

### 2. Get Group Info
```
GET https://gate.whapi.cloud/groups/{groupId}
Authorization: Bearer {WHAPI_TOKEN}

Response:
{
  "id": "120363376937486419@g.us",
  "name": "Group Name",
  "participants": [
    {
      "id": "491234567890@c.us",
      "name": "User Name",
      ...
    }
  ]
}
```

## Phone Number Formats

The system handles multiple phone number formats:
- `+491234567890`
- `491234567890`
- `01234567890`
- `1234567890`

All are normalized for comparison.

## Deployment

### Deploy Edge Functions

```bash
# Deploy send-whatsapp-verification
supabase functions deploy send-whatsapp-verification --no-verify-jwt

# Deploy lookup-whatsapp-groups
supabase functions deploy lookup-whatsapp-groups --no-verify-jwt
```

### Set Environment Variables

```bash
supabase secrets set VITE_WHAPI_TOKEN=your_token_here
```

## Testing

### Test Verification Flow
1. Go to `http://localhost:3000/new-campaign`
2. Select "Artist" or "Manager"
3. Select "Ja" (existing customer)
4. Enter phone number
5. Click "Code per WhatsApp senden"
6. Check WhatsApp for verification code
7. Enter code
8. Click "Weiter"
9. Should see list of artists or "create new" option

### Test Group Lookup
Use the edge function directly:

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/lookup-whatsapp-groups \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+49 123 456 7890"}'
```

## Error Handling

- Invalid phone number → Error toast
- Code mismatch → Error toast
- No artists found → Success toast with "create new" option
- API errors → Error toast with generic message
- Network errors → Error toast

## Security Notes

- Verification codes are 6 digits (100,000 - 999,999)
- Codes are stored in component state only (not persisted)
- Codes expire after 10 minutes (mentioned in WhatsApp message)
- JWT verification is disabled for edge functions (--no-verify-jwt)
- WHAPI token is stored in Supabase secrets

## Future Improvements

1. **Code Expiration**: Implement server-side code expiration
2. **Rate Limiting**: Limit verification attempts per phone number
3. **Code Persistence**: Store codes in database with expiration
4. **Retry Logic**: Add retry mechanism for failed API calls
5. **Better Error Messages**: More specific error messages for users
6. **Phone Validation**: Add phone number format validation before sending
7. **Group Caching**: Cache group membership data to reduce API calls
