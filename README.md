# Webhook Receiver - Dapur Kehadiran

Webhook receiver untuk menerima data kehadiran dari backend.

## 🚀 Setup & Deploy

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login ke Vercel
```bash
vercel login
```

### 3. Deploy ke Vercel
```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

## 📝 Endpoint

Setelah deploy, endpoint webhook akan tersedia di:
```
https://your-project.vercel.app/api/v1/webhooks/incoming/your-webhook-id
```

## 🧪 Testing Locally

### Run development server:
```bash
vercel dev
```

### Test dengan curl:
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/incoming/test \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "message": "Test",
    "data": {
      "kehadiranData": [
        {
          "sekolahId": "123",
          "sekolahNama": "SDN Test",
          "totalHadir": 50
        }
      ]
    }
  }'
```

## 📦 Struktur File

```
webhook-receiver/
├── api/
│   └── webhooks.js      # Main webhook handler
├── package.json         # Project dependencies
├── vercel.json          # Vercel configuration
└── README.md           # Documentation
```

## 🔧 Configuration

Update `DAPUR_KEHADIRAN_WEBHOOK_URL` di backend dengan URL Vercel setelah deploy.

## 📊 Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Webhook received and processed successfully",
  "receivedAt": "2025-10-28T10:30:00.000Z",
  "dataCount": 1
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error details"
}
```
