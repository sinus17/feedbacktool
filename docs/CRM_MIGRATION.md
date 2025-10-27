# CRM Tables Migration for Campaign Submissions

## Overview
Migrated CRM-related tables from the reporting database to the feedback tool database to enable the complete campaign submission workflow within the feedback tool.

## Database Structure

### 1. Extended `artists` Table

**New Columns Added:**
- `customer_id` (UUID) - Links to customers table
- `spotify_url` (TEXT) - Artist's Spotify profile
- `instagram_url` (TEXT) - Artist's Instagram profile
- `tiktok_url` (TEXT) - Artist's TikTok profile

**Existing Columns:**
- `id` (TEXT) - Primary key
- `name` (TEXT) - Artist name
- `element_id` (TEXT) - External reference
- `whatsapp_group_id` (TEXT) - WhatsApp group identifier
- `submissions` (INTEGER) - Number of submissions
- `last_submission` (TIMESTAMP) - Last submission date
- `archived` (BOOLEAN) - Archive status
- `created_at` (TIMESTAMP) - Creation timestamp

### 2. New `customers` Table

Stores customer/company information.

```sql
- id (UUID) - Primary key
- name (TEXT) - Customer/company name
- type (TEXT) - 'company' or 'individual'
- created_at (TIMESTAMP) - Creation timestamp
```

**Indexes:**
- `idx_customers_name` - Fast lookup by name
- `idx_customers_type` - Filter by customer type

### 3. New `contacts` Table

Stores contact person information associated with customers.

```sql
- id (UUID) - Primary key
- customer_id (UUID) - References customers table
- first_name (TEXT) - Contact's first name
- last_name (TEXT) - Contact's last name
- email (TEXT) - Email address (unique)
- phone (TEXT) - Phone number
- street (TEXT) - Street address
- zip (TEXT) - Postal code
- city (TEXT) - City
- country (TEXT) - Country
- whatsapp_group_link (TEXT) - WhatsApp group invite link
- whatsapp_group_id (TEXT) - WhatsApp group ID
- notion_dashboard_link (TEXT) - Notion dashboard URL
- created_at (TIMESTAMP) - Creation timestamp
```

**Indexes:**
- `idx_contacts_customer_id` - Fast lookup by customer
- `idx_contacts_email` - Fast lookup by email
- `idx_contacts_phone` - Fast lookup by phone

### 4. New `artist_contacts` Table

Junction table linking artists to their contacts (many-to-many relationship).

```sql
- artist_id (TEXT) - References artists table
- contact_id (UUID) - References contacts table
- PRIMARY KEY (artist_id, contact_id)
```

**Indexes:**
- `idx_artist_contacts_artist_id` - Fast lookup by artist
- `idx_artist_contacts_contact_id` - Fast lookup by contact

### 5. New `releases` Table

Stores release/campaign information (simplified version for feedback tool).

```sql
- id (UUID) - Primary key
- name (TEXT) - Release name
- artist_id (TEXT) - References artists table
- customer_id (TEXT) - Customer reference
- release_date (DATE) - Release date
- spotify_uri (TEXT) - Spotify URI
- cover_link (TEXT) - Cover image URL
- master_file_link (TEXT) - Master audio file URL
- budget (NUMERIC) - Campaign budget
- currency (TEXT) - Currency (default: EUR)
- status (TEXT) - Release status (default: active)
- notion_link (TEXT) - Notion page URL
- content_board_link (TEXT) - Content board URL
- dropbox_link (TEXT) - Dropbox folder URL
- facebook_page_url (TEXT) - Facebook page URL
- created_at (TIMESTAMP) - Creation timestamp
- updated_at (TIMESTAMP) - Last update timestamp
- user_id (UUID) - User who created the release
```

**Indexes:**
- `idx_releases_artist_id` - Fast lookup by artist
- `idx_releases_customer_id` - Fast lookup by customer
- `idx_releases_release_date` - Sort by release date
- `idx_releases_status` - Filter by status
- `idx_releases_user_id` - Filter by user

### 6. New `release_submissions` Table

Stores campaign submissions from the public form at `/new-campaign`.

```sql
-- Artist/Contact Information
- id (UUID) - Primary key
- kuenstlername (VARCHAR) - Artist name
- vorname (VARCHAR) - First name
- nachname (VARCHAR) - Last name
- firma (VARCHAR) - Company name (optional)
- email (VARCHAR) - Email address
- telefon (VARCHAR) - Phone number

-- Address Information
- strasse (VARCHAR) - Street address
- plz (VARCHAR) - Postal code
- ort (VARCHAR) - City
- land (VARCHAR) - Country

-- Release Information
- release_name (VARCHAR) - Release name
- release_date (DATE) - Release date
- master_datei_link (TEXT) - Master file URL
- cover_link (TEXT) - Cover image URL
- spotify_uri (TEXT) - Spotify URI
- facebook_page_url (TEXT) - Facebook page URL
- content_ordner (TEXT) - Content folder URL

-- Budget & Services
- werbebudget_netto (INTEGER) - Net advertising budget (min: 650€)
- content_strategy_upsell (BOOLEAN) - Content strategy add-on
- voucher_promocode (VARCHAR) - Promo code

-- Customer Status
- ist_neukunde (BOOLEAN) - Is new customer

-- Processing Status
- status (VARCHAR) - Processing status (default: 'neu')
- bearbeitet_von (VARCHAR) - Processed by
- bearbeitet_am (TIMESTAMP) - Processing timestamp
- notizen (TEXT) - Notes

-- Relations
- campaign_id (UUID) - References releases table
- artist_id (TEXT) - References artists table
- contact_id (UUID) - References contacts table
- created_at (TIMESTAMP) - Submission timestamp
```

**Indexes:**
- `idx_release_submissions_status` - Filter by status
- `idx_release_submissions_created_at` - Sort by submission date
- `idx_release_submissions_campaign_id` - Link to campaign
- `idx_release_submissions_artist_id` - Link to artist
- `idx_release_submissions_email` - Fast lookup by email

**Constraints:**
- `werbebudget_netto >= 65000` (650€ minimum budget in cents)

## Data Flow

### Campaign Submission Process

1. **User submits form** at `/new-campaign`
   - Fills in artist, contact, address, release, and budget information
   - Data is validated on frontend

2. **WhatsApp verification** (for existing customers)
   - Phone number verified via WhatsApp code
   - System looks up artists via cached WhatsApp group members
   - User selects existing artist or creates new one

3. **Submission stored** in `release_submissions` table
   - All form data saved
   - Status set to 'neu' (new)
   - Awaits admin processing

4. **Admin processes submission**
   - Reviews submission in admin panel
   - Creates/updates customer, contact, artist records
   - Creates release/campaign record
   - Links submission to campaign via `campaign_id`

### Relationships

```
customers (1) ──→ (many) contacts
    ↓
artists (many) ←→ (many) contacts (via artist_contacts)
    ↓
releases (many) ←→ (1) artist
    ↓
release_submissions (many) ←→ (1) release
```

## Migration Applied

✅ Extended `artists` table with CRM columns
✅ Created `customers` table
✅ Created `contacts` table
✅ Created `artist_contacts` junction table
✅ Created `releases` table
✅ Created `release_submissions` table
✅ Added all necessary indexes
✅ Set up foreign key constraints
✅ Enabled Row Level Security (RLS)
✅ Created RLS policies (public access)
✅ Added `updated_at` trigger for releases

## Next Steps

### 1. Update Campaign Submission Edge Function

Create/update `submit-campaign` edge function to:
- Accept form data from `/new-campaign`
- Insert into `release_submissions` table
- Send notification to admins
- Return success/error response

### 2. Create Admin Processing Interface

Build admin panel to:
- View pending submissions (`status = 'neu'`)
- Create/link customers, contacts, artists
- Create release/campaign records
- Update submission status
- Add processing notes

### 3. Update Frontend

Modify `NewCampaignSubmission.tsx` to:
- Submit to new edge function
- Handle success/error responses
- Show confirmation message

### 4. Add Validation

Implement server-side validation:
- Email format validation
- Phone number format validation
- Budget minimum check (650€)
- Required fields check
- Duplicate submission prevention

## Security Considerations

### Current RLS Policies

All tables have **public access** for now:
- ✅ Anyone can read
- ✅ Anyone can insert (needed for public form)
- ✅ Authenticated users can update

### Recommended Future Restrictions

1. **Release Submissions**
   - Public: INSERT only
   - Authenticated: READ, UPDATE
   - Admin: DELETE

2. **Customers/Contacts**
   - Authenticated: READ, INSERT, UPDATE
   - Admin: DELETE

3. **Releases**
   - Authenticated: READ, INSERT, UPDATE
   - Admin: DELETE

## Testing

### Test Campaign Submission

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/submit-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "kuenstlername": "Test Artist",
    "vorname": "John",
    "nachname": "Doe",
    "email": "john@example.com",
    "telefon": "+49 123 456789",
    "strasse": "Test Street 123",
    "plz": "12345",
    "ort": "Berlin",
    "land": "Deutschland",
    "release_name": "Test Release",
    "release_date": "2025-03-01",
    "werbebudget_netto": 65000,
    "ist_neukunde": false
  }'
```

### Query Submissions

```sql
-- Get all pending submissions
SELECT * FROM release_submissions 
WHERE status = 'neu' 
ORDER BY created_at DESC;

-- Get submissions with artist info
SELECT 
  rs.*,
  a.name as artist_name
FROM release_submissions rs
LEFT JOIN artists a ON rs.artist_id = a.id
ORDER BY rs.created_at DESC;
```

## Benefits

✅ **Self-contained**: All campaign data in feedback tool database
✅ **Fast**: No cross-database queries needed
✅ **Scalable**: Proper indexing for fast lookups
✅ **Flexible**: Can extend tables as needed
✅ **Secure**: RLS enabled for future restrictions
✅ **Maintainable**: Clear relationships and constraints

## Comparison with Reporting Database

| Feature | Reporting DB | Feedback Tool DB |
|---------|-------------|------------------|
| Artists | UUID ID | TEXT ID (8 digits) |
| Releases | Complex (30+ columns) | Simplified (essential only) |
| Submissions | Separate table | Separate table ✅ |
| Customers | ✅ | ✅ Migrated |
| Contacts | ✅ | ✅ Migrated |
| WhatsApp Groups | In contacts | In artists + cache table |

## Files Created

1. `/supabase/migrations/20250127170000_add_crm_tables_for_campaigns.sql` - Migration file
2. `/docs/CRM_MIGRATION.md` - This documentation
