# ADR-0011: S3 + CloudFront for the web, Lightsail for the API, MongoDB Atlas in Mumbai
- Status: Accepted
- Date: 2026-10-05

## Context
- **Platform choice:** the client chose AWS.
- **Scale:** the v1 load is small (plan assumption A6), but real-time and payments need an always-on server with stable latency in India.
- **Free plans don't work:** they either forbid payments or sleep when idle.

## Decision
| Piece | Choice |
|---|---|
| Web | Private S3 bucket + CloudFront (Origin Access Control); SPA fallback to `index.html` |
| Web caching | Hashed assets cached 1 year (immutable); `index.html` and the service worker never cached |
| Web headers | Response-headers policy: CSP, HSTS, frame-ancestors none |
| API | Amazon Lightsail (Mumbai), 2 GB in production and 1 GB in staging; Docker Compose with the API + Caddy (automatic TLS, WebSocket proxy); static IP; SSH only from admin IPs |
| Database | MongoDB Atlas, Mumbai. **Flex** in production (backups); Free tier for staging only (no backups, 100 ops/s) |
| Email | Amazon SES, Mumbai. Production access requested in week 1; DKIM, SPF and DMARC on the domain |
| DNS | Route 53 |
| Environments | local (Docker MongoDB replica set) → staging (`staging.brand.in`, Razorpay test) → production |
| CI/CD | GitHub Actions: pull requests run lint, typecheck, tests, build, size and Playwright smoke; `main` deploys to staging; tags deploy to production after approval |

## Alternatives considered
- **AWS Amplify Hosting:** fine for the web, but S3 + CloudFront gives explicit control of headers and caching at lower cost.
- **ECS Fargate or App Runner:** more moving parts and higher cost than one always-on instance needs.
- **Elastic Beanstalk:** heavier operations for the same result.
- **Amazon DocumentDB:** about US$80 a month minimum, and not fully MongoDB-compatible.

## Consequences
- **Operations we own:** OS updates (unattended-upgrades), Docker image cleanup and log shipping (CloudWatch agent).
- **Backups:** Atlas Flex snapshots plus a weekly encrypted `mongodump` to S3. A restore drill happens in Phase 9.
- **Scaling out** later uses a Lightsail load balancer + 2 instances + Redis (plan C18).
