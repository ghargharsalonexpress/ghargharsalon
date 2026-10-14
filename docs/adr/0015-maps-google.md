# ADR-0015: Google Maps Platform, with a cost-aware arrival time
- Status: Accepted
- Date: 2026-10-05

## Context
Maps are used in five places:
- address search and pin at checkout;
- the live tracking map for the customer;
- the route in the professional's panel;
- the admin live map;
- the arrival time (ETA).

India pricing (October 2026): about 70,000 free calls a month per SKU. After that:

| SKU | Price per 1,000 calls |
|---|---|
| Dynamic Maps | $2.10 |
| Autocomplete | $0.85 |
| Place Details Essentials | $1.50 |
| Compute Routes Essentials | $1.50 |

Autocomplete sessions that end in Place Details are cheaper. Advanced Markers need a Map ID.

## Decision
- **React integration:** `@vis.gl/react-google-maps`, the Google-sponsored library, loaded only on routes that show a map.
- **Map style:** a Map ID with muted brand styling, and Advanced Markers.
- **Address search:** Places Autocomplete (New) with session tokens, ending in Place Details Essentials (location and address components).
- **Arrival time:**
  - before payment it is calculated locally from straight-line distance, so it costs nothing per quote;
  - after accept, the Routes API (Compute Routes Essentials) returns the real route and ETA;
  - it is refreshed every 3 minutes, or when the professional drifts more than 300 m from the route.
- **Billing:** alerts and quotas are set in Google Cloud.

## Alternatives considered
- **Mapbox or OpenStreetMap:** weaker address search in Indian localities, and another vendor.
- **Routes or Distance Matrix for every quote:** a cost on every checkout view, for little gain over a range estimate.

## Consequences
- **Usage:** expected to stay inside the free tier at launch and growth sizes (proposal section 6).
- **Attribution:** "Powered by Google" must appear in address search.
- **Fallback:** if Maps fails to load, the address is shown as text with an "Open in Google Maps" link.
