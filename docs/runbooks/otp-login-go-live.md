# Mobile OTP login: what is left before it works on the live site

Since this change is on `main`, the live site uses the new login (ADR-0020):
- **Customers and professionals** log in at `/login` with their mobile number and a 6-digit code sent by SMS. A new number only adds a name and becomes a customer.
- **Admins** log in at `/admin/login` ("Team login") with email and password, as before.

**Until the steps below are done, the live server cannot send SMS:** customers and professionals cannot log in there yet. Admins can.

## 1. The client (2–7 working days)

1. Create an account on **2Factor.in** in the company's name and add a prepaid SMS balance.
2. Complete **DLT registration** (a TRAI rule for business SMS in India; 2Factor guides it):
   - register the company as a Principal Entity (PAN / GST certificate) and note the Entity ID;
   - choose a 6-letter sender ID, for example `GGSALN`;
   - get this OTP template approved (the code goes where `{#var#}` is):
     `{#var#} is your Ghar Ghar Salon Express login code. It is valid for 5 minutes. Do not share it with anyone.`
   - link the approved template and sender ID in the 2Factor dashboard.
3. Share privately (not in a group chat): the **2Factor API key**, the **template name** as shown in 2Factor, and the **sender ID**.

## 2. Us, once the client's details arrive (about 30 minutes)

1. **Test locally first:** in `apps/api/.env`, set `SMS_TRANSPORT=2factor`, `TWOFACTOR_API_KEY=…` and `TWOFACTOR_OTP_TEMPLATE=…`, and remove `SMS_DEV_CODE`. Then:
   - restart the API;
   - send a code from `/login` to a real phone and log in with it;
   - put the local settings back afterwards.
2. **Live database, once:**
   - add this PC's IP in Atlas → Network Access;
   - run `npm run migrate:otp-login` in `apps/api` with `MONGODB_URI` set to the live database;
   - it stops if a mobile number belongs to two accounts (fix those in Admin first), then updates the user indexes.
3. **Live server settings:** add `SMS_TRANSPORT=2factor`, `TWOFACTOR_API_KEY` and `TWOFACTOR_OTP_TEMPLATE` where the live API reads its environment, then restart or redeploy it. Never set `SMS_DEV_CODE` or `LOGIN_RATE_LIMITS=0` on a server.
4. **Check on the live site:**
   - log in with a new number (you get the name step), then with the same number again;
   - log in with a professional's number (you land on `/pro`);
   - log in as admin at `/admin/login`.

## Good to know

- **Professionals:** add them in Admin → Professionals with their mobile number (email is optional). Nothing is emailed; they just log in with that number.
- **Changing a customer's number** goes through support for now.
- **Local demos:** `SMS_DEV_CODE=1` and `LOGIN_RATE_LIMITS=0` in the local `apps/api/.env` show the code on the login screen and drop the resend wait (see [local-development.md](local-development.md)).
- **Cost and abuse:** each SMS costs money. The API limits codes per number (one every 30 s, 3 in 15 minutes, 10 a day) and per IP (20 an hour).
- **Background:** [ADR-0020](../adr/0020-mobile-otp-login.md), and [production-setup.md](production-setup.md) section 3a.
