# ADR-0020: Mobile number + SMS code login for customers and professionals (2Factor.in)
- Status: Accepted
- Date: 2026-10-15
- Supersedes: ADR-0005 for customers and professionals (passwords, set-password and reset links). Sessions, cookies, CSRF and lifetimes stay as ADR-0005 says. Admins keep email + password.

## Context
- **The client's request:** login and sign-up should work like the big Indian home-beauty apps (Yes Madam). People type a mobile number, get a code by SMS, and are in. A new number only adds a name.
- **Phone OTP was already preferred:** ADR-0005 called it "a better fit for India" and kept it on the backlog. Most bookings happen on phones, and many professionals don't use email.
- **SMS provider:** the client chose **2Factor.in**. In India every business SMS needs a DLT-registered sender and an approved template, and 2Factor handles that registration.

## Decision
- **Who logs in how:**
  - **Customers:** `/login`, number → 6-digit code. An unknown number gets a name step (email optional) and becomes a customer.
  - **Professionals:** the same `/login`. There is no self sign-up: the admin adds them with their mobile number (email optional), and they log in with it. The set-password email is gone.
  - **Admins:** `/admin/login` ("Team login"), email + password as before. "Forgot password" serves team accounts only. An admin's number on `/login` is told to use Team login, and only after the right code.
- **One account per number:** `users.phone` is unique. Email is optional and unique only when present (a partial index).
- **The code:**
  - The API makes it, not the SMS company: 6 digits from a CSPRNG, stored only as an HMAC (key derived from `SESSION_SECRET`), and valid for 5 minutes. A new code replaces the old one.
  - 2Factor only delivers it (`GET /API/V1/{key}/SMS/91{number}/{code}/{template}`). Changing provider later means writing one transport.
- **Limits:**
  - **Per number, stored in the database** so they hold across restarts: resend after 30 s, 3 sends in 15 minutes, 10 a day. After 5 wrong tries the code is dead.
  - **Per IP:** 20 sends an hour and 30 checks in 10 minutes, to stop SMS pumping.
  - Each try is counted before the comparison, so parallel guesses get at most 5 looks at a code.
- **Nothing leaks before the code:** the send answer is the same whether or not the number has an account. Blocked, suspended and team accounts are only named after the right code.
- **The name step:**
  - A verified new number is held in a fresh session (regenerated, so a planted session id is useless) for 15 minutes.
  - The name step can only create a customer, and never takes a role or a phone from the request.
- **Transports** (`SMS_TRANSPORT`):
  - `2factor` in production; the config refuses anything else there.
  - `log` while developing: the code appears in the API window.
  - `memory` in tests: E2E reads it from `/__test__/sms/latest`.
  - With `SMS_DEV_CODE=1`, a local demo API also returns the code, and the login screen shows it. This works only with the log transport and a localhost `WEB_URL`, and it is refused in production, so a public server can never show it.

## Alternatives considered
- **2Factor's own OTP (AUTOGEN + VERIFY):** fewer lines of code, but checking would depend on their uptime, tests would need their sandbox, and switching provider would change the login logic.
- **Firebase Phone Auth:** no DLT work on our side, but it brings reCAPTCHA into the login, a Google project, and a browser SDK the CSP would have to allow. ADR-0008 already chose not to depend on Firebase.
- **Keep passwords next to OTP:** more screens and more support, and a password to forget. The client chose OTP only.

## Consequences
- **Going live** needs the client's 2Factor account, a DLT-approved OTP template, and `SMS_TRANSPORT=2factor` with `TWOFACTOR_API_KEY` and `TWOFACTOR_OTP_TEMPLATE`. Until then, deploying this would lock customers out (docs/runbooks/production-setup.md).
- **Existing data:** run `npm run migrate:otp-login` once on each database. It lists numbers used by more than one account (fix those first), then removes the old `email_1` index (unique for everyone, so a second customer without an email would be refused) and creates the new ones. On start-up the API only ever *adds* indexes, so an older API sharing the database keeps working; it logs a reminder while the old index or duplicate numbers remain.
- **Changing a number** goes through support for now. A self-service change would need a code sent to the new number.
- **SMS costs money per message.** The limits above and the per-IP limit keep abuse bounded. Production has one API instance; with more instances the per-IP limits need the shared store from plan C18.
