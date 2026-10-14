# Staging deploy (AWS + MongoDB Atlas)

**Status:** waiting for the client's accounts (`docs/inputs-needed.md`). Everything in the repository is ready. Production follows the same steps with production values (plan C16).

| Piece | Staging | Production |
|---|---|---|
| Web | S3 + CloudFront, `staging.brand.in` | S3 + CloudFront, `brand.in` |
| API | Lightsail 1 GB, `api.staging.brand.in` | Lightsail 2 GB, `api.brand.in` |
| Database | Atlas Free (Mumbai) | Atlas Flex (Mumbai) with backups |
| Email | SES sandbox (verified recipients only) | SES production access |

## 1. MongoDB Atlas
1. Create the project and a cluster in **Mumbai (ap-south-1)**.
2. Create a database user with readWrite on the `brand` database only. Store the password in a password manager.
3. Network access: add the Lightsail static IP (step 3). Never use 0.0.0.0/0.
4. Copy the connection string (`mongodb+srv://…/brand`). Atlas clusters are replica sets, so transactions work.

## 2. Amazon SES (ap-south-1)
1. Verify the domain `brand.in` with Easy DKIM (3 CNAME records). Add SPF and DMARC records.
2. Staging stays in the sandbox: verify each test recipient's address.
3. Production access (lifting the sandbox) is requested in Phase 9.
4. Create an IAM user or role with only `ses:SendEmail`. Its keys go into `.env.api` on the server, or into the instance role.

## 3. API on Lightsail
1. Create an Ubuntu 24.04 instance (1 GB for staging) and attach a **static IP**.
2. Firewall: allow 80 and 443 from anywhere, and 22 from the admins' IPs only.
3. Install Docker Engine and the compose plugin.
4. DNS: add an A record from `api.staging.brand.in` to the static IP.
5. Build and push the image from the repository root:
   ```bash
   docker build -f apps/api/Dockerfile -t <registry>/brand-api:<tag> .
   docker push <registry>/brand-api:<tag>
   ```
   Use AWS ECR while GitHub is on hold.
6. On the server, put these in `~/brand/`:
   - `infra/docker-compose.yml`
   - `infra/Caddyfile`
   - `.env`, containing `API_IMAGE=<registry>/brand-api:<tag>` and `API_DOMAIN=api.staging.brand.in`
   - `.env.api` (`chmod 600`), from `apps/api/.env.example` with:
     - `NODE_ENV=production` and `TRUST_PROXY=1`
     - `MONGODB_URI=<Atlas>`
     - `SESSION_SECRET` and `CSRF_SECRET`: new random values for each environment
     - `WEB_ORIGINS=https://staging.brand.in` and `WEB_URL=https://staging.brand.in`
     - `COOKIE_DOMAIN=.staging.brand.in`
     - `EMAIL_TRANSPORT=ses`, `EMAIL_FROM=Brand <no-reply@brand.in>`, `AWS_REGION=ap-south-1`
7. Start it: `docker compose pull && docker compose up -d`. Caddy gets the TLS certificate on its own.
8. Create the admin:
   ```bash
   docker compose run --rm -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… api node dist/seed-admin.js
   ```
9. Check https://api.staging.brand.in/health/ready, which should return `{"status":"ok"}`.

The API refuses to start in production if `COOKIE_DOMAIN` is missing, if email isn't SES, if the test routes are on, or if any web origin isn't https.

## 4. Web on S3 + CloudFront
1. Create an S3 bucket with all public access blocked.
2. Create a CloudFront distribution:
   - **Origin:** the bucket, through Origin Access Control.
   - **Certificate:** ACM, in us-east-1.
   - **SPA fallback:** custom error responses for 403 and 404 that return `/index.html` with status 200.
   - **Cache:** hashed assets under `/assets/*` cache for a year (immutable). `index.html` and the service worker are never cached.
   - **Response headers policy:** from `infra/cloudfront/security-headers.json`. For staging, set `connect-src` to `api.staging.brand.in`.
3. Build and upload:
   ```bash
   cd apps/web
   VITE_API_URL=https://api.staging.brand.in npm run build
   aws s3 sync dist s3://<bucket> --delete
   aws cloudfront create-invalidation --distribution-id <id> --paths /index.html
   ```
4. DNS: add an alias record from `staging.brand.in` to the distribution.

## 5. Sign-off checks (plan Phase 2 DoD)
- [ ] Sign up, log in, log out, forgot and reset work on a phone and on a laptop, in English and Hindi.
- [ ] https://securityheaders.com gives grade A for `staging.brand.in` and `api.staging.brand.in`.
- [ ] API logs reach CloudWatch (CloudWatch agent on the instance).
- [ ] The seeded admin can log in and is sent to `/admin`.

## Rollback
- **API:** set `API_IMAGE` back to the previous tag, then `docker compose up -d`.
- **Web:** re-upload the previous `dist` (keep the last few builds), then invalidate `/index.html`.
