# Local development

Runs the whole platform on one machine: MongoDB, the API and the web app. Takes about 10 minutes the first time (mostly downloads).

## Prerequisites
- **Node.js 22.12 or newer** (`node --version`). React Router 8 will need 22.22 or newer later (ADR-0017).
- **Microsoft Edge or Google Chrome**, for the browser tests.
- **Docker Desktop is optional.** Without it, MongoDB runs through `npm run db`.

## 1. Install (once)
Each package installs separately until the npm-workspaces cutover (ADR-0018):

```bash
cd packages/shared && npm install
cd ../../apps/api && npm install
cd ../web && npm install
```

## 2. Database
Pick one:

**Without Docker** (data kept in `apps/api/.data/mongo`):
```bash
cd apps/api && npm run db
```
Leave it running.

**With Docker Desktop:**
```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Both give `MONGODB_URI=mongodb://127.0.0.1:27018/brand?replicaSet=rs0`. It is a one-node replica set because booking transactions need one (Phase 6).

## 3. API (port 4000)
```bash
cd apps/api
cp .env.example .env
```

Edit `.env`:
- Set `SESSION_SECRET` and `CSRF_SECRET`. Generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The password needs 12+ characters, must not contain the email, and must not be a common password.

Then:
```bash
npm run seed:admin              # creates the first admin; add --reset-password to change it later
npm run seed:catalog            # loads the migrated catalogue (add -- --replace to overwrite)
npm run seed:demo               # a verified demo professional and a demo customer (logins in .data/demo-accounts.txt)
npm run dev                     # restarts on every change
```

**Job alerts (Web Push):** generate VAPID keys once and put them in `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`):
```bash
npx web-push generate-vapid-keys
```
Without keys the API logs each alert instead of sending it, and the professional panel says alerts aren't set up. Push needs `localhost` or HTTPS; to try alerts on a phone, use the staging site.

Check it with http://localhost:4000/health/ready.

**Emails:** nothing is sent in development. Each email is saved as an `.html` file in `apps/api/.mail/`. Open it in a browser to follow reset links.

## 4. Web (port 5174)
```bash
cd apps/web && npm run dev
```

| Page | What it is |
|---|---|
| http://localhost:5174/signup | Create a customer account |
| http://localhost:5174/login | Log in (the admin from step 3 lands on `/admin`) |
| http://localhost:5174/forgot-password | Reset flow; the link is in `apps/api/.mail/` |
| http://localhost:5174/styleguide | Design system and brand samples |

**API address:** the web calls `http://localhost:4000` by default. To change it, copy `apps/web/.env.example` to `.env.local` and set `VITE_API_URL`.

## 5. Tests

| Where | Command | What it runs |
|---|---|---|
| `packages/shared` | `npm test` | Schemas, phone helpers, settings rules |
| `apps/api` | `npm test` | Integration tests on an in-memory MongoDB: auth, sessions, CSRF, rate limits, roles, settings, catalogue, professionals, bookings and payments, matching (including 100 runs of simultaneous accepts), jobs, admin operations and an authorisation check of every protected endpoint. The first run downloads MongoDB (~100 MB). |
| `apps/web` | `npm test` | Unit tests (contrast, formatting, durations, cart, live location) |
| `apps/web` | `npm run e2e` | Playwright on its own ports (web 5175, API 4100, in-memory DB): public site, auth, admin catalogue, the professional panel, the booking lifecycle in two browsers, admin operations, accessibility (axe) and visual snapshots. It never touches your dev data. |

Before handing work over, also run `npm run typecheck`, `npm run lint` and `npm run build` in each package.

## 6. Try an instant booking end to end (two browsers)

The whole flow runs locally without any client keys: payments use a test payment sheet, alerts and emails are logged, and maps fall back to text.

1. Demo logins: `npm run seed:demo` in `apps/api` (once). The logins are in `apps/api/.data/demo-accounts.txt`; the admin login is in `apps/api/.env`.
2. **Professional** (one browser, for example Edge): log in as the demo professional and open `/pro`. Do the readiness steps (allow alerts and send a test alert, allow location), then switch **Online**. Keep this window visible.
3. **Customer** (a second browser or a private window): log in as the demo customer, add a service, open the cart and **Checkout**. Add an address with "Use my current location", then **Pay**. The test payment sheet appears; choose **Pay**.
4. The professional's window opens the job alert by itself (with a sound once the Online switch has been tapped). **Accept job**, then **I've arrived**. Type the start code that the customer's booking page shows, then **Complete service**.
5. The customer rates the service and opens the invoice. The admin sees everything in Dashboard, Live board and Bookings.

Things that stop a booking, and the fix:

| What you see | Why | Fix |
|---|---|---|
| "We're closed right now" | Service hours are 08:00–21:00 India time | Admin → Settings → Hours and areas: change the hours for testing |
| "We don't serve this area yet" | The service area is Delhi NCR | Admin → Settings → Service areas: remove the area (no limit) or add yours |
| "Everyone nearby is busy" | The professional isn't online, or the window was hidden for over a minute | Bring the professional's window to the front and switch Online again |
| "No one nearby offers all of these services" | The demo professional does women's salon, makeup and spa | Book one of those services |

## 7. See the whole happy path (live demo or PDF)

Two scripts in `apps/web` play the booking above for you. Both use the same steps (`scripts/demo/flow.mjs`), and both click only what a person would.

| Command | What happens | Time |
|---|---|---|
| `npm run demo` | Needs the app from steps 2–4 running. Edge opens the customer on the left (English) and the professional's phone on the right (Hindi); the admin window opens while the job is on. Each step shows a caption, and the terminal explains it too. The windows stay open at the end; press Ctrl+C in the terminal to close them. | About 4 minutes |
| `npm run walkthrough` | Plays it on the test stack (ports 5175/4100, its own in-memory database), saves every screen to `Proposal/happy-path/`, then builds `Proposal/Happy_Path.pdf` (and `happy-path.html`) in the folder that holds this repository. | About 3 minutes |
| `npm run flow-document` | The full project-flow document for the client: every screen of all three apps (82), in 11 stages plus the other paths (failed payment, declined alert, nobody free, customer cancel), each with its purpose, what is on it and where each button leads. Same test stack; screens go to `Proposal/project-flow/`, then it builds `Proposal/Project_Flow.pdf` (and `project-flow.html`). The texts are in `scripts/demo/flow-document.content.mjs`; the build stops if a screen has no text, a text has no screen, or a link points nowhere. | About 5 minutes |

About `npm run demo`:

- It uses the demo logins (`npm run seed:demo`) and the admin login in `apps/api/.env`, and books "Vitamin C Brightening Facial" (set `DEMO_SERVICE` to another service's slug to change it).
- Outside service hours it opens the hours for the demo and sets them back right after the job, or on Ctrl+C. Both changes are listed in Admin → Audit log.
- Before it starts, it closes any booking the demo professional is still on (full refund). At the end it sets the professional offline.
- `DEMO_SPEED=2` halves the pauses and `DEMO_SPEED=0.5` doubles them (PowerShell: `$env:DEMO_SPEED=2; npm run demo`).
- Your dev data keeps what the demo creates: the customer's address (first run only), and a completed booking with its review, invoice and earning.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Your session needed a refresh" on every form | The browser is blocking cookies for localhost. Allow them, or use a normal (non-private) window. |
| `EADDRINUSE` on 4000, 5174 or 27018 | Something else is using the port. Stop it, or change `PORT` / `--port`. |
| The API exits with "Invalid environment configuration" | The message lists the variables to fix in `apps/api/.env`. |
| `npm run seed:admin` says the password is too easy to guess | Use a longer passphrase that doesn't contain the email's name part. |
