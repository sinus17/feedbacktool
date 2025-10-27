#!/bin/bash

# Test WHAPI group lookup for Test DXR
# Group ID: 120363298754236172
# Channel: ROCKET-24F79

WHAPI_TOKEN="coRWJTwRGdqohY8gykipkezKA4SPO5dh"
GROUP_ID="120363298754236172@g.us"

echo "Testing WHAPI group lookup..."
echo "Channel: ROCKET-24F79"
echo "Group ID: $GROUP_ID"
echo ""

curl -X GET "https://gate.whapi.cloud/groups/${GROUP_ID}" \
  -H "Authorization: Bearer ${WHAPI_TOKEN}" \
  -H "Accept: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "Test complete!"
