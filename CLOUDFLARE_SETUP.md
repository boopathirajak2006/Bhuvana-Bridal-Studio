# Bhuvana Bridal Studio backend

The Worker uses Cloudflare D1 for bookings, owner accounts, sessions, audit logs, and notification jobs. Cloudinary stores private booking posters. WhatsApp and FCM remain optional integrations configured through Worker secrets.

## Local-only check

Run these commands from the `cloudflare` folder:

```powershell
npx wrangler d1 migrations apply bhuvana-bookings-db --local
npx wrangler dev --local
```

`--local` uses local simulated Cloudflare resources. Do not add `--remote`, run a remote D1 command, or deploy as part of local testing. The additive migration `0004_booking_reservation_token.sql` adds a nullable hash column and preserves existing rows.

The health endpoint is `http://127.0.0.1:8787/api/health`.

## Local owner account

For a fresh local D1 database only, copy `.dev.vars.example` to `.dev.vars` and set a strong `OWNER_INITIAL_PASSWORD`. The owner is seeded only if the database has no owner rows. Existing owner accounts and password hashes are never replaced. Keep `.dev.vars` private and never commit it.

## External services

Poster uploads require Cloudinary API credentials. WhatsApp and FCM require their own credentials. Leave these unset during safe local health checks; do not use production credentials or real customer data for local experiments. No Supabase or R2 credentials are used by the active Worker.
