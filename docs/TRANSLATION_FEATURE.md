# Google Cloud Translation Integration

## Overview
Gemini AI analyzes videos in **German** by default, with automatic translation to **English** using Google Cloud Translation API.

## Implementation

### 1. Database Schema
- **Primary Column**: `gemini_analysis` (jsonb) - German analysis (default)
- **Translation Column**: `gemini_analysis_en` (jsonb) - English translation
- Stores both German (original) and English (translated) versions

### 2. Edge Functions

#### `translate-gemini-analysis`
- **Location**: `/supabase/functions/translate-gemini-analysis/`
- **Purpose**: Translates Gemini analysis to target language (English or German)
- **API**: Google Cloud Translation API v2
- **API Key**: `AIzaSyDSSNnnzvp8B__633-XmXjJOnJ9G7xj5Ms`
- **Project ID**: `meta-fulcrum-290906`
- **Parameters**: `videoId`, `targetLang` ('en' or 'de')

**Translates:**
- Hook
- Content Type
- Visual Style
- Shotlist (array)
- Engagement Factors (array)

#### `analyze-video-gemini` (Updated)
- **Prompts Gemini in German** - Analysis is generated in German
- Automatically triggers **English translation** after analysis
- Fire-and-forget background translation
- No blocking of the analysis response

### 3. Frontend (VideoDetailModal)

**Language Toggle:**
- 🇩🇪 **Deutsch (Standard)** - Default language
- 🇺🇸 English

**Behavior:**
- Clicking 🇩🇪 shows `gemini_analysis` (German - original)
- Clicking 🇺🇸:
  - If English translation exists: Shows it immediately
  - If English translation doesn't exist: Triggers translation in real-time
  - Shows spinning ⏳ icon while translating
  - Automatically updates UI when translation completes
- Purple highlight on active language
- Buttons disabled during translation

### 4. Data Flow

**Automatic Translation (Background):**
```
1. Video analyzed by Gemini AI (in German)
   ↓
2. German analysis saved to `gemini_analysis`
   ↓
3. English translation triggered in background
   ↓
4. Google Cloud Translation API translates each field to English
   ↓
5. English translation saved to `gemini_analysis_en`
```

**On-Demand Translation (User-Triggered):**
```
1. User clicks 🇺🇸 flag
   ↓
2. Check if `gemini_analysis_en` exists
   ↓
3. If not exists:
   - Show ⏳ loading spinner
   - Call translate-gemini-analysis function with targetLang='en'
   - Wait for translation to complete
   - Update UI with English translation
   ↓
4. If exists:
   - Show English translation immediately
```

## Usage

### Automatic Translation
When a video is analyzed with Gemini AI (in German), the English translation happens automatically in the background.

### Manual Translation
To manually trigger English translation for a specific video:

```bash
curl -X POST \
  https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/translate-gemini-analysis \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"videoId": "VIDEO_ID_HERE", "targetLang": "en"}'
```

### Frontend Display
The VideoDetailModal automatically detects if German translation exists and shows the language toggle buttons.

## API Costs
Google Cloud Translation API pricing:
- $20 per 1M characters
- Average analysis: ~500 characters
- Cost per translation: ~$0.01

## Future Enhancements
- Add more languages (🇫🇷 French, 🇪🇸 Spanish, etc.)
- Cache translations to avoid re-translating
- Batch translation for multiple videos
- Translation quality feedback
