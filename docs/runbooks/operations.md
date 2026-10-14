# Operations runbook

What to do when something goes wrong with a live booking or a provider. The admin console handles most cases without a developer. Each section says what you see, what to do, and when to call a developer.

## A booking is stuck "searching"

**You see:** a "Slow search" or "No professional" alert, or the dashboard's "Searching" count stays above zero.

1. Open the booking from the alert (Admin → Bookings → the booking).
2. Under **Offers**, check who was alerted and what they did (waiting, declined, expired). "No push device" means that professional's phone gets alerts only while the panel is open.
3. Click **Send direct offer**. The list shows eligible professionals online nearby, nearest first. Pick one and call them to say an alert is coming.
4. If nobody is eligible, click **Cancel booking**. Keep the fee at ₹0 so the customer gets a full refund, and write the reason. The customer sees it at once and gets an email.

The search also ends by itself when its time runs out (Settings → "Search gives up after"). The full refund starts automatically, and the customer gets an email.

## A professional can't make it after accepting

- **The professional cancels** in their panel: the booking goes back to searching without them, and you get a "Pro cancelled" alert. Nothing else to do unless the search runs long.
- **The professional stops answering:** open the booking and click **Reassign**. They're released and told on their phone, and the booking searches again.
- **Running late:** the "Running late" alert appears after the arrival range plus the late threshold (Settings). The customer can cancel for free from that point. Call the professional; if needed, reassign.

## A refund failed

**You see:** a "Refund failed" alert, a red "Refund failed" badge in Bookings, or a failed row in Payments → Refunds.

1. Open the booking. Under **Money**, the refund shows "Failed" with the gateway's message.
2. Click **Retry**. The refund is sent to Razorpay again and the alert is resolved.
3. If it fails again, check the Razorpay Dashboard → Refunds for that payment.
   - "Refund amount exceeds" means it was already refunded there. Mark the alert resolved and add a note.
   - Otherwise call Razorpay support with the payment ID shown in the booking.

Refunds that the gateway keeps rejecting are retried automatically for about 20 minutes before they're marked failed.

## The start code is locked

**You see:** a "Code locked" alert. The professional typed a wrong code five times.

1. Call the customer and confirm the professional is at the door.
2. If all is well, open the booking and click **Unlock start code**. The wrong-code count goes back to zero, the alert is resolved, and the professional can type the code again.
3. If anything feels wrong, cancel the booking with a full refund and note why.

## Customer says nobody came / disputes a fee

1. Open the booking: the **Timeline** shows who did what and when. The professional's location trail is kept for 30 days, and a developer can read it if needed.
2. If the customer should get money back, use **Refund** (up to what's still refundable) and write the reason. It's in the audit log.
3. If a review is abusive, hide it in Reviews; the professional's rating updates.

## Job alerts aren't arriving (push outage)

**You see:** professionals say alerts don't come, and offers show "no push device" or don't get accepted.

1. Ask one professional to open the panel. With the panel open, alerts arrive through the live connection, with the in-app sound, even when push fails.
2. In Admin → Professionals → the professional → **Send test alert**. "Sent to 0 devices" means their phone needs to allow alerts again (Readiness checklist in their panel).
3. If no one gets any alert, check the API logs for `webpush` errors. Wrong or changed VAPID keys need a developer.

## Razorpay is down

**You see:** checkout fails at "Pay", or payments stay unpaid.

1. Check status.razorpay.com.
2. Customers' unpaid bookings close after the unpaid timeout (Settings) and nothing is charged.
3. A payment that succeeds at Razorpay but reaches us late is matched by the 10-minute reconciliation job, or refunded automatically if its booking already closed.
4. No action is needed after the outage. Watch Payments → Refunds for anything failed.

## Maps quota or key problems

**You see:** maps show "The map couldn't load". Bookings still work, and the pages show the same facts as text.

1. Google Cloud Console → APIs & Services → Quotas and Billing: check the daily quota and that billing is active.
2. Check that the key's website restrictions include the site's address.

## The API or database is down

1. Health check: `https://api.brand.in/health/ready` should answer `{"status":"ok"}`.
2. On the Lightsail server: `docker compose ps` and `docker compose logs api --tail 200`.
3. Restart: `docker compose up -d`. The timers, outbox and reconciliation resume where they stopped. Searches that ran out during the downtime end with an automatic refund.

## Restore from backup

1. Atlas → the cluster → Backup → Restore a snapshot to a new cluster (never over the live one).
2. Point a staging API at the restored cluster and check a few recent bookings and refunds.
3. To switch production: put the site in maintenance (stop the API), change `MONGODB_URI`, start the API, and check `/health/ready`.
4. Rehearse this once before launch (Phase 9), and write down how long it took.

## Who can do what

| Task | Where |
|---|---|
| Direct offer, reassign, unlock a start code, cancel with fee, refund, notes | Admin → Bookings → a booking |
| Block or unblock a customer | Admin → Customers → a customer |
| Suspend a professional (not during a job), mark payouts | Admin → Professionals → a professional |
| Retry a failed refund | Admin → Payments → Refunds, or the booking |
| Hide a review | Admin → Reviews |
| Hours, areas, fees, matching | Admin → Settings (every change is versioned and audited) |
| Who changed what | Admin → Audit log |
