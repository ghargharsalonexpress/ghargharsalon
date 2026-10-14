# ADR-0014: Broadcast offers to the nearest 3; first accept wins
- Status: Accepted
- Date: 2026-10-05

## Context
- **The promise:** a professional reaches the customer in 10–15 minutes.
- **Push can be delayed** (ADR-0008), and professionals may be busy or away from the phone.
- **Two professionals must never be assigned to the same booking.**

## Decision
- **Before payment:** `POST /v1/availability/quote` confirms that at least one **eligible** professional exists and returns an arrival range.
  - The range is the straight-line distance × 1.4 ÷ 18 km/h + 3 minutes, as a 6-minute band.
  - Eligible means all of these:
    - active and online, with a heartbeat in the last 60 s;
    - not on a job;
    - within `min(settings radius, their travel radius)`;
    - has every required skill;
    - matches the gender preference.
- **After payment:** rounds of up to 3 offers (setting, max 5), each with a 30-second window.
  - **Ranking:** distance in 500 m bands → rating ↓ → jobs today ↑ → longest since last job.
  - **Next rounds** exclude anyone already offered and continue until the 120-second search deadline.
- **Accept is atomic.** One MongoDB transaction claims the professional (`activeBookingId: null → id`) and the booking (`searching → accepted`). Any other offer accepted at the same moment gets "Job already taken". Remaining offers are revoked.
- **Admin direct offer:** a single offer to a chosen eligible professional, using the same accept path.
- **Professional cancels while en route:** the booking returns to `searching` with a fresh deadline, and that professional is excluded.

## Alternatives considered
- **One professional at a time:** each 30-second window adds up, so one decline or a delayed push breaks the 10–15 minute promise.
- **Alert everyone in range:** spams professionals, rewards whoever's phone is fastest over whoever is nearest, and wastes notifications.
- **Auto-assign without accept:** the professional may not be ready, so no-shows go up.

## Consequences
- **Tests:** a concurrency test (100 runs × 5 simultaneous accepts → exactly 1 winner) and a restart test are mandatory.
- **Operations:** the admin dashboard shows offers per booking, time to accept and no-match rate, to tune the settings.
