# Production setup: accounts, keys and settings

What the client's accounts must provide before staging and launch, and where each value goes. Everything in this list already works in code. It runs locally without these values because the app uses a local mode instead (test payment sheet, logged emails, logged alerts, local image folder).

The API refuses to start in production if any required value is missing or unsafe (`apps/api/src/config.ts`), so a half-configured deploy fails loudly instead of misbehaving.

## 1. API environment (`apps/api`, file mode 600 or SSM Parameter Store)

| Variable | Production value | Where it comes from |
|---|---|---|
| `NODE_ENV` | `production` | — |
| `MONGODB_URI` | Atlas connection string (Mumbai, Flex or M10) | Atlas → Connect → Drivers. The cluster must be a replica set (Atlas always is); transactions are required. |
| `SESSION_SECRET`, `CSRF_SECRET` | 32+ random bytes each, different | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `WEB_ORIGINS` | `https://brand.in,https://www.brand.in` | The site's own addresses, all `https` |
| `WEB_URL` | `https://brand.in` | Used in email links |
| `COOKIE_DOMAIN` | `.brand.in` | So the session works on `brand.in` and `api.brand.in` |
| `TRUST_PROXY` | `1` | Caddy sits in front of the API |
| `BRAND_NAME`, `SUPPORT_EMAIL`, `SUPPORT_PHONE` | The client's | Decision D8/D9 |
| `EMAIL_TRANSPORT` | `ses` | — |
| `EMAIL_FROM` | `Brand <no-reply@brand.in>` | A verified SES identity |
| `AWS_REGION` | `ap-south-1` | — |
| `MEDIA_STORAGE`, `IMAGEKIT_PRIVATE_KEY`, `MEDIA_BASE_URL` | `imagekit`, the private key, the ImageKit URL endpoint | ImageKit (section 4) |
| `PUSH_TRANSPORT` | `webpush` | — |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Generated once, kept forever | `npx web-push generate-vapid-keys`. Changing them signs every professional out of alerts. |
| `PAYMENT_PROVIDER` | `razorpay` | — |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Test keys on staging, live keys in production | Razorpay Dashboard → Account & Settings → API keys |
| `RAZORPAY_WEBHOOK_SECRET` | The secret typed when creating the webhook | Section 2 |
| `SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_GSTIN` | The invoicing business, exactly as registered | The client's CA (assumption A1). A malformed GSTIN stops the API. |
| `SMS_TRANSPORT` | `2factor` | Login codes by SMS (section 3a, ADR-0020) |
| `TWOFACTOR_API_KEY`, `TWOFACTOR_OTP_TEMPLATE` | The 2Factor API key and the DLT-approved OTP template's name | Section 3a |
| `SMS_DEV_CODE` | unset (off) | Local demos only; refused in production |
| `LOGIN_RATE_LIMITS` | unset (on) | Never off in production |
| `TEST_ROUTES` | unset (off) | Never on in production |
| `CHECKOUT_RATE_LIMITS` | unset (on) | Never off in production |

## 2. Razorpay

1. Create the account and finish KYC (live mode needs it; test mode works at once).
2. API keys: create test keys for staging, live keys for production. Put them in the API environment.
3. Webhook: Dashboard → Webhooks → Add.
   - URL: `https://api.brand.in/v1/webhooks/razorpay`
   - Secret: a long random string; the same value goes in `RAZORPAY_WEBHOOK_SECRET`.
   - Events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
4. Instant refunds: enable them (assumption A5). No-match refunds request speed "optimum", which uses an instant refund when it's available.
5. Test on real phones before launch (Phase 5 DoD): a UPI app payment on Android Chrome, a card in iOS Safari, a closed payment window, a failed payment, and a refund.

## 3. Amazon SES (email)

1. Verify the domain `brand.in` in SES (Mumbai) and add the DKIM records to the DNS.
2. Ask for production access (SES starts in a sandbox that only sends to verified addresses).
3. Set `EMAIL_FROM` to an address on the verified domain.
4. Optional: an SNS topic for bounces and complaints.

## 3a. SMS login codes (2Factor.in)

Customers and professionals log in with their mobile number and a 6-digit code by SMS (ADR-0020). The API makes and checks the code; 2Factor only delivers it. Admins keep Team login (email + password), so they are unaffected.

1. **2Factor account** in the company's name, with a prepaid SMS balance.
2. **DLT registration** (a TRAI rule for every business SMS in India; 2Factor guides it):
   - register the company as a Principal Entity (PAN/GST certificate) and note the Entity ID;
   - a 6-letter sender ID (header), for example `GGSALN`;
   - an OTP template, approved, with the code as the only variable, for example:
     `{#var#} is your Ghar Ghar Salon Express login code. It is valid for 5 minutes. Do not share it with anyone.`
   - link the approved template and sender ID in the 2Factor dashboard. This usually takes 2 to 7 working days.
3. **API environment:** `SMS_TRANSPORT=2factor`, `TWOFACTOR_API_KEY` (from the 2Factor dashboard) and `TWOFACTOR_OTP_TEMPLATE` (the template's name there).
4. **Test before switching the live site:** on a local API with these three values, send a code to a real phone from `/login` and log in with it.
5. **Each database, once:** with this PC's IP in Atlas → Network Access, run `npm run migrate:otp-login` in `apps/api`. It lists numbers that belong to more than one account (fix those in Admin first), then moves the user indexes (email unique only when present, phone unique).
6. **Then deploy.** Never deploy this login before steps 1–5: without a working SMS sender, customers and professionals can't log in.

## 4. Images (ImageKit)

The API uploads one full-size master per photo, stripped of its location and camera data, and
ImageKit builds every size and format from the URL. Nothing else has to be configured for sizes.

1. An ImageKit account (the free plan covers the pilot: 20 GB storage and 20 GB delivery a month).
2. Copy the **private key** from Developer options → API keys into `IMAGEKIT_PRIVATE_KEY`. The public
   key is not needed: uploads go through the API, never the browser.
3. `MEDIA_BASE_URL` is the URL endpoint (for example `https://ik.imagekit.io/ghargharsalon`, or a
   custom domain). The web build uses the same value as `VITE_MEDIA_URL`, sets
   `VITE_MEDIA_MODE=imagekit`, and the CSP `img-src` must include it.
4. After switching, run `npm run seed:catalog -- --replace` in `apps/api` once, so the seeded photos
   are re-uploaded to ImageKit. Photos stored the old way keep the old URL shape and would 404.

> `MEDIA_STORAGE=imagekit` and `VITE_MEDIA_MODE=imagekit` must be set together: the first decides
> where a photo is written, the second decides how the browser asks for it.

## 5. Google Maps Platform

1. A Google Cloud project with billing in India and a budget alert (for example ₹2,000 a month at first).
2. Enable: Maps JavaScript API, Places API (New), and Routes API (for road arrival times later).
3. Matching ranks by road distance with a **second, server-side key**: create one restricted to the
   **Routes API** only (no referrer restriction — it is used from the server, not a browser) and set
   it as `GOOGLE_MAPS_SERVER_KEY` on the API. One call per search round, at most 6 origins. Without
   it, matching uses the straight-line estimate and nothing breaks; `matching.useRoadDistance` in
   `/admin/settings` turns it off entirely.
4. Create a browser key restricted to `https://brand.in/*` and `https://www.brand.in/*` and to those APIs. It goes in the web build as `VITE_GOOGLE_MAPS_KEY`.
5. With the key set, the booking, live board and professional job pages show maps. Without it they show the same facts as text, and nothing breaks.

## 6. Web build (`apps/web`)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.brand.in` |
| `VITE_MEDIA_URL` | The ImageKit URL endpoint |
| `VITE_MEDIA_MODE` | `imagekit` |
| `VITE_GOOGLE_MAPS_KEY` | The restricted browser key |
| `VITE_PRO_FORM_URL` | The professional application Google Form |
| `VITE_RELEASE` | The release tag, sent with client error reports |
| `SITE_URL`, `API_URL` | For `robots.txt` and `sitemap.xml` at build time |

Build with `npm run build` in `apps/web`. Upload `dist/` to the web bucket. Cache hashed assets for a year; never cache `index.html`, `sw.js` or the manifests.

## 7. Security headers

`infra/cloudfront/security-headers.json` is the CloudFront response-headers policy. It covers CSP (Razorpay Checkout and Google Maps allowed), HSTS, no framing, nosniff, the referrer policy and the permissions policy. For staging, swap `api.brand.in` for the staging API address. Check the result on securityheaders.com (target: grade A).

## 8. Before launch

- [ ] Settings reviewed in Admin → Settings: hours, service areas, fees, commission, platform fee.
- [ ] Legal pages approved by the client's adviser (assumption A13).
- [ ] Hindi reviewed by a native speaker (A14).
- [ ] Real-device tests: alerts with the app closed on 3 Android brands and an iPhone; UPI payment; live location outdoors.
- [ ] Backups: Atlas snapshots on, plus a weekly `mongodump` to S3; one restore rehearsed ([operations.md](operations.md#restore-from-backup)).
