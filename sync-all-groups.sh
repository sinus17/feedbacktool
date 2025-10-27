#!/bin/bash

# Sync all WhatsApp group members to cache
# This will populate the artist_whatsapp_group_members table

echo "🔄 Starting sync of all WhatsApp group members..."
echo ""

curl -X POST \
  "https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/sync-whatsapp-group-members" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybGdveGJ6bG5nZHRvbWpodm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjQ3NjUsImV4cCI6MjA1MDEwMDc2NX0.qkXVMHxQbLHqEcxQz8Ek_gKCPCMTQJPqhVQJbCQQTJI" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "✅ Sync complete!"
echo ""
echo "Check the results above to see how many artists were synced successfully."
