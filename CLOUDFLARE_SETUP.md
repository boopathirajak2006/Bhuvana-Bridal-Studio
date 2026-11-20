# Bhuvana Bridal Studio backend

The Worker uses Cloudflare D1 for bookings, owner accounts, sessions, audit logs, notification jobs, owner-managed gallery photos, customer reference-image records, and owner-published copy overrides. Cloudinary stores private customer reference photos and owner-published portfolio photos. WhatsApp and FCM remain optional integrations configured through Worker secrets.

## Local-only check

Run these commands from the `cloudflare` folder:

```powershell
npx wrangler d1 migrations apply bhuvana-bookings-db --local
npx wrangler dev --local
```

`--local` uses local simulated Cloudflare resources. Do not add `--remote`, run a remote D1 command, or deploy as part of local testing. Migrations `0005_studio_gallery.sql` and `0006_studio_content.sql` add gallery and content tables; `0007_gallery_subcategories.sql` separates gallery categories; `0008_gallery_library.sql` migrates legacy photos into a flexible owner-managed library and adds booking contact/reference-image storage.

The health endpoint is `http://127.0.0.1:8787/api/health`.

## Local owner account

For a fresh local D1 database only, copy `.dev.vars.example` to `.dev.vars` and set a strong `OWNER_INITIAL_PASSWORD`. The owner is seeded only if the database has no owner rows. Existing owner accounts and password hashes are never replaced. Keep `.dev.vars` private and never commit it.

## External services

Poster and portfolio uploads require Cloudinary API credentials. Gallery uploads accept JPEG, PNG, and WebP images up to 5 MB. For local uploads, use a non-production Cloudinary account and locally simulated D1. WhatsApp and FCM require their own credentials. Leave these unset during safe local health checks; do not use production credentials or real customer data for local experiments. No Supabase or R2 credentials are used by the active Worker.
