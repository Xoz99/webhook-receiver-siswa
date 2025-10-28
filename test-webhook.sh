#!/bin/bash

# Test script untuk webhook receiver
echo "🧪 Testing Webhook Endpoint..."
echo ""

# Test endpoint URL
ENDPOINT="http://localhost:3000/api/v1/webhooks/incoming/test"

# Test data
TEST_DATA='{
  "success": true,
  "message": "Data calculated successfully",
  "data": {
    "kehadiranData": [
      {
        "sekolahId": "4301290c-0fa8-465f-b7a8-82db3535d878",
        "sekolahNama": "SDN 01 Kebayoran Baru",
        "totalHadir": 150
      },
      {
        "sekolahId": "5402391d-1gb9-576g-c8b9-93ec4646e989",
        "sekolahNama": "SDN 02 Menteng",
        "totalHadir": 200
      }
    ]
  }
}'

echo "📤 Sending POST request to: $ENDPOINT"
echo ""

# Send request
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  -w "\n\n📊 Status Code: %{http_code}\n" \
  -s

echo ""
echo "✅ Test completed!"
echo ""
echo "💡 Tip: Check your Vercel logs to see the webhook processing details"
