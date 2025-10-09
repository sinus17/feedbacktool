#!/bin/bash

# Videos to re-analyze with German prompt
VIDEOS=(
  "9ef936b9-c0d8-4461-aee8-2028bb59c75c"
  "3d6f0436-8b04-4c51-834c-2cfc1c91b503"
  "1dd3c164-0535-42ea-a230-b1ff5153ca3c"
  "008d117f-be72-4a7c-9c6c-dbfffe5dadc6"
  "45d92166-eb5f-4b6c-9811-d53fa7eeba1f"
  "aeb82571-1ac0-42d2-a3cd-fd206f9b7d39"
)

SUPABASE_URL="https://wrlgoxbzlngdtomjhvnz.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0OTA3NzcsImV4cCI6MjA0ODA2Njc3N30.ZCAreV5YsR26maw8QrulmTq7GSXvfpYuKXP-ocTfhtk"

echo "🎬 Starting re-analysis of ${#VIDEOS[@]} videos with German prompt..."
echo ""

for VIDEO_ID in "${VIDEOS[@]}"; do
  echo "📹 Analyzing video: $VIDEO_ID"
  
  RESPONSE=$(curl -s -X POST \
    "$SUPABASE_URL/functions/v1/analyze-video-gemini" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"videoId\": \"$VIDEO_ID\"}")
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Analysis completed successfully"
    echo "⏳ English translation triggered in background"
  else
    echo "❌ Analysis failed: $RESPONSE"
  fi
  
  echo ""
  echo "⏸️  Waiting 5 seconds before next video..."
  sleep 5
done

echo "🎉 All videos re-analyzed!"
echo "📊 Check the database for German analysis and English translations"
