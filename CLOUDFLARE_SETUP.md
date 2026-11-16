# Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend Setup & Deployment Guide

This guide provides end-to-end instructions for deploying the Bhuvana's Bridal & Tailoring Studio serverless backend on Cloudflare Workers, Cloudflare D1 (SQLite database), Cloudflare R2 (object storage), Firebase Cloud Messaging (FCM HTTP v1), and Meta WhatsApp Business Cloud API.

---

## 1. System Architecture Overview

```
[ Customer Browser (GitHub Pages) ]
      │
      │ 1. POST /api/bookings/reserve (Draft reference)
      │ 2. Render Poster canvas locally to PNG
      │ 3. POST /api/bookings/submit (PNG + Details multipart)
      ▼
[ Cloudflare Workers Backend ]
      ├── Cloudflare D1 (Database: Bookings, Sessions, Audit Logs, Devices)
      ├── Cloudflare R2 (Private Image Bucket: Customer Booking Posters)
      ├── Firebase Cloud Messaging (Web Push Notifications to Studio Owner)
      └── Meta WhatsApp Business Cloud API (Official Status Templates to Customer)
      ▲
      │ 4. Authenticated Session / Private Poster / Approve / Reject
[ Studio Owner Portal (studio-inbox.html) ]
```

---

## 2. Zero-Cost Free Plan Resource Allocation

The entire backend is architected to run permanently on generous, zero-cost free plans:

| Service | Free Tier Allocation | Studio Monthly Usage Estimate | Cost |
| :--- | :--- | :--- | :--- |
| **Cloudflare Workers** | 100,000 requests / day | ~2,000 – 5,000 requests / month | **$0.00** |
| **Cloudflare D1** | 5 GB storage, 5M reads/day, 100k writes/day | < 50 MB, < 10k reads/month | **$0.00** |
| **Cloudflare R2** | 10 GB storage, 1M Class A, 10M Class B ops/mo | < 2 GB, < 5,000 ops/month | **$0.00** |
| **Firebase Cloud Messaging** | Unlimited push messages | < 500 owner push alerts/month | **$0.00** |
| **Meta WhatsApp Cloud API** | 1,000 free service conversations / month | ~100 – 300 customer updates/month | **$0.00** |

---

## 3. Prerequisites

1. **Node.js** (v18 or higher) installed on your machine.
2. A free **Cloudflare Account** ([dash.cloudflare.com](https://dash.cloudflare.com/)).
3. A free **Firebase Account** ([console.firebase.google.com](https://console.firebase.google.com/)).
4. A **Meta Developer Account** ([developers.facebook.com](https://developers.facebook.com/)) with WhatsApp Cloud API enabled.

---

## 4. Step-by-Step Deployment Instructions

### Step 4.1: Install Wrangler CLI & Authenticate
Open a terminal in your project directory:
```bash
npm install -g wrangler
# or use npx wrangler directly

# Log in to your Cloudflare account
npx wrangler login
```

---

### Step 4.2: Create Cloudflare D1 Database
Create the production D1 SQLite database:
```bash
npx wrangler d1 create bhuvana-bridal-db
```
*Note the `database_id` printed in the terminal output.*

Open `cloudflare/wrangler.jsonc` and replace the placeholder `database_id`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "bhuvana-bridal-db",
    "database_id": "PASTE_YOUR_ACTUAL_DATABASE_ID_HERE"
  }
]
```

---

### Step 4.3: Apply Database Migrations
Execute the 3 schema migrations to create the required tables and indexes:
```bash
# Migration 1: Initial schema (bookings, owners, sessions, devices)
npx wrangler d1 execute bhuvana-bridal-db --file=cloudflare/migrations/0001_initial_schema.sql --remote

# Migration 2: Performance & uniqueness indexes
npx wrangler d1 execute bhuvana-bridal-db --file=cloudflare/migrations/0002_booking_indexes.sql --remote

# Migration 3: Notification jobs & audit logs
npx wrangler d1 execute bhuvana-bridal-db --file=cloudflare/migrations/0003_notification_tables.sql --remote
```

---

### Step 4.4: Create Cloudflare R2 Storage Bucket
Create the private R2 bucket for storing generated customer booking posters:
```bash
npx wrangler r2 bucket create bhuvana-bridal-posters
```

---

### Step 4.5: Configure Production Secrets
Set the required security and API credentials using `wrangler secret put`:

```bash
# 1. Studio Owner Initial Credentials
npx wrangler secret put OWNER_INITIAL_USERNAME
# Enter: admin

npx wrangler secret put OWNER_INITIAL_PASSWORD
# Enter: YourSecureOwnerPassword2026!

# 2. Firebase Cloud Messaging (FCM HTTP v1)
npx wrangler secret put FIREBASE_PROJECT_ID
# Enter your Firebase project ID (e.g. bhuvana-bridal-studio)

npx wrangler secret put FIREBASE_CLIENT_EMAIL
# Enter the client email from your downloaded Firebase service account JSON

npx wrangler secret put FIREBASE_PRIVATE_KEY
# Enter the private key from your Firebase service account JSON (including -----BEGIN PRIVATE KEY-----)

# 3. Meta WhatsApp Business Cloud API
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
# Enter your Meta Phone Number ID

npx wrangler secret put WHATSAPP_ACCESS_TOKEN
# Enter your System User Permanent Access Token

npx wrangler secret put WHATSAPP_VERIFY_TOKEN
# Enter a secure custom string for webhook verification (e.g. BhuvanaWebhookVerify2026!)

npx wrangler secret put WHATSAPP_APP_SECRET
# Enter your Meta App Secret for webhook HMAC validation
```

---

### Step 4.6: Deploy the Cloudflare Worker
Run the deployment command from the project root:
```bash
cd cloudflare
npx wrangler deploy
```

Once deployed, Wrangler will output your live worker URL:
`https://bhuvana-bridal-studio.<your-subdomain>.workers.dev`

---

### Step 4.7: Connect Frontend to Your Live Worker
Open `js/cloudflare-config.js` and set `PRODUCTION_WORKER_URL` to your live worker URL:
```javascript
const PRODUCTION_WORKER_URL = 'https://bhuvana-bridal-studio.<your-subdomain>.workers.dev';
```

---

## 5. Meta WhatsApp Business Cloud API Setup

### WhatsApp Message Templates
In the Meta WhatsApp Manager, register and approve two utility templates:

#### Template 1: `booking_approved`
- **Category:** Utility
- **Language:** English (`en`)
- **Body text:**
  ```text
  Hello {{1}},

  Great news! Your booking enquiry (Ref: {{2}}) with Bhuvana's Bridal & Tailoring Studio for {{3}} has been APPROVED.

  Bhuvaneshwari will be in touch shortly regarding service timings and advance consultation.

  Studio Location: Erumbalai, Salem
  Contact: +91 63740 36629
  ```

#### Template 2: `booking_rejected`
- **Category:** Utility
- **Language:** English (`en`)
- **Body text:**
  ```text
  Hello {{1}},

  Thank you for reaching out to Bhuvana's Bridal & Tailoring Studio.

  Regarding your booking enquiry (Ref: {{2}}) for {{3}}, we regret to inform you that we are unable to accept this booking due to: {{4}}.

  Please contact us directly at +91 63740 36629 to discuss alternate dates or tailored packages.
  ```

### Meta Webhook Setup
1. In Meta App Dashboard, navigate to **WhatsApp > Configuration**.
2. Click **Edit** under **Webhook**.
3. **Callback URL:** `https://bhuvana-bridal-studio.<your-subdomain>.workers.dev/api/whatsapp/webhook`
4. **Verify Token:** The exact value you set in `WHATSAPP_VERIFY_TOKEN`.
5. Subscribe to the **`messages`** webhook field.

---

## 6. Studio Owner Portal Usage

1. Open `studio-login.html` in your browser.
2. Sign in with the owner credentials configured in Step 4.5.
3. In `studio-inbox.html`:
   - View real-time KPI counts (**Pending**, **Approved**, **Rejected**).
   - Filter and search incoming bookings.
   - Click **Review** on any enquiry to inspect customer details, selected bridal & tailoring services, special notes, and the private generated booking poster.
   - Click **✓ Approve Booking** to approve and dispatch WhatsApp confirmation.
   - Click **✕ Reject Booking** to select a reason and dispatch cancellation notice.
   - Click **Export Backup** anytime to download the full D1 SQLite dataset as a JSON backup file.

---

## 7. Verification & Health Check

Test that your deployed worker is active:
```bash
curl https://bhuvana-bridal-studio.<your-subdomain>.workers.dev/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-16T...",
  "service": "Bhuvana's Bridal Studio Cloudflare Backend",
  "version": "2.0.0"
}
```
