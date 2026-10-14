# Catalogue migration

Generated 2026-10-05 by `node scripts/catalog/migrate.mjs` from `src/store/data`, following the rules in [catalog-audit.md](catalog-audit.md). Output: `apps/api/seed/catalog.json`, loaded with `npm run seed:catalog` in `apps/api`.

## Result
|  | Women | Men | Total |
|---|---|---|---|
| Categories | 4 | 5 | 9 |
| Services | 173 | 21 | 194 |
| Price tiers |  |  | 234 |

## Identity (rule 1)
- women/stripless-korean-bikini-wax: 3 copies merged into one (salon-for-women)
- women/korean-glow-facial: 2 copies merged into one (salon-for-women)
- women/classic-pedicure: 2 copies merged into one (salon-for-women)
- women/ice-cream-pedicure: 2 copies merged into one (salon-for-women)
- women/sara-pedicure: 2 copies merged into one (salon-for-women)
- women/nail-paint-apply: 2 copies merged into one (salon-for-women)
- women/bubble-jelly-foot-soak: 2 copies merged into one (salon-for-women)
- women/korean-body-polishing: 2 copies merged into one (salon-for-women)
- women/korean-full-body-scrub: 2 copies merged into one (salon-for-women, spa-for-women)
- women/full-hand-scrub: 2 copies merged into one (salon-for-women)
- women/full-leg-scrub: 3 copies merged into one (salon-for-women, spa-for-women)
- women/henna_application: 3 copies merged into one (salon-for-women, hair-styling)
- women/eyebrows-threading-addon: 2 copies merged into one (salon-for-women)
- women/haircut_blowdry: 2 copies merged into one (hair-styling)
- women/head_oil_massage: 2 copies merged into one (hair-styling)
- women/full-body-swedish-massage: 2 copies merged into one (spa-for-women)

Renamed because the same id existed for women and men:
- men/foot-reflexology → men-foot-reflexology (same id existed for women)
- men/sports-therapy → men-sports-therapy (same id existed for women)
- men/full-back-scrub → men-full-back-scrub (same id existed for women)
- korean-luxe-pedicure: "Korean Luxe Manicure & Pedicure" → "Korean Luxe Pedicure" (pedicure only, by slug, price and summary)
- classic-pedicure: "Classic Manicure & Pedicure" → "Classic Pedicure" (pedicure only, by slug, price and summary)
- ice-cream-pedicure: "Ice Cream Manicure & Pedicure" → "Ice Cream Pedicure" (pedicure only, by slug, price and summary)
- o3-plus-pedicure: "O3+ Manicure & Pedicure" → "O3+ Pedicure" (pedicure only, by slug, price and summary)
- sara-pedicure: "Sara Manicure & Pedicure" → "Sara Pedicure" (pedicure only, by slug, price and summary)

Titles cleaned:
- women/korean-waxing-ritual: "Korean Waxing Ritual - Full Arms + Full Legs + Underarms" → "Korean Waxing Ritual – Full Arms + Full Legs + Underarms"
- women/rica-gold-roll-on: "Rica Gold Roll On - Full Arms + Full Legs + Underarms" → "Rica Gold Roll On – Full Arms + Full Legs + Underarms"
- women/cut-file-polish-hands: "Cut, File & Polish - Hands" → "Cut, File & Polish – Hands"
- women/bleach-face-neck: "Bleach - Face & Neck" → "Bleach – Face & Neck"
- women/bleach-face-only: "Bleach - Face" → "Bleach – Face"
- women/D-detan-face: "T10 Detan - Face" → "T10 Detan – Face"
- women/kw-premium-tiered-ritual: "Korean Waxing Premium Ritual – Tier Packages" → "Korean Waxing Premium Ritual"
- women/netrica-tinvex-premium-wax: "NETRICA & TINVEX Premium Wax – Tier Packages" → "NETRICA & TINVEX Premium Wax"
- women/wedding_basic_3: "Basic Makeup Combo --  3 persons" → "Basic Makeup Combo – 3 persons"
- women/wedding_basic_7: "Basic Makeup Combo - 7 Persons" → "Basic Makeup Combo – 7 Persons"
- women/wedding_basic_5: "Basic Makeup Combo - 5 Persons" → "Basic Makeup Combo – 5 Persons"
- women/hd-makeup-combo-3: "HD Makeup Combo -  3 person" → "HD Makeup Combo – 3 person"
- men/unwind-stress-massage: "Unwind Stress - Head, Neck & Shoulder Massage" → "Unwind Stress – Head, Neck & Shoulder Massage"

Identical copies under different ids (same name, price and duration) merged into the most detailed one:
- korean-waxing-ritual → korean-waxing-ritual-full ("Korean Waxing Ritual (Full Arms + Full Legs + Underarms)", same price and duration)
- eyebrow-threading → eyebrows-threading ("Eyebrows Threading", same price and duration)
- marine-algae-peel → marine-algae-peel-off-gel-mask ("Marine Algae Peel-Off Gel Mask", same price and duration)

**Client: please decide.** The same name appears more than once with different prices. Both stay bookable until you deactivate one in the admin (Services):
- "Korean Waxing Ritual (Full Arms + Full Legs + Underarms)": `korean-waxing-ritual-full` ₹799 · 30 min, `kw-fullarms-fulllegs-underarms` ₹799 · 75 min
- "O3+ Pedicure": `o3-plus-pedicure` ₹650 · 60 min, `o3plus-pedicure` ₹649 · 60 min
- "Eyebrows Threading": `eyebrows-threading` ₹30 · 10 min, `eyebrows-threading-addon` ₹35 · 5 min
- "Upper Lip Threading": `upper-lip-threading` ₹30 · 10 min, `upper-lips-threading-addon` ₹30 · 5 min, `upperlip-threading-addon` ₹35 · 5 min
- "Charcoal Algae Peel-Off Mold Mask": `charcoal-algae-peel-off-mask` ₹300 · 25 min, `charcoal-algae-peel-off-mold-mask` ₹299 · 25 min
- "Head Massage": `head-massage` ₹139 · 20 min, `head-massage-addon` ₹169 · 10 min
- "Head, Neck & Shoulder Massage": `head-neck-shoulder-massage` ₹229 · 35 min, `haircare-head-neck-shoulder-massage` ₹329 · 35 min, `head-neck-shoulder` ₹655 · 25 min
- "Touch-up Using Your Own Product": `touchup-own-product` ₹219 · 40 min, `touch-up-own-product` ₹320 · 40 min
- "Full Hair Color Application": `full-hair-color` ₹329 · 60 min, `full-hair-color-application` ₹480 · 60 min
- "Temporary Hair Straightening": `temporary-hair-straightening` ₹279 · 50 min, `temp-hair-straightening` ₹400 · 50 min
- "Hair Curls & Waves": `hair-curls-waves` ₹279 · 50 min, `hair-curls-and-wave` ₹400 · 50 min

## Filters (rule 5)
| Legacy value | Services |
|---|---|
| "Other" → (dropped) | 8 |
| "HydraGlo Facials" → facials | 1 |
| "Shade Packages" → shaadi-packages | 1 |
| "Korean Glow" → korean-glow | 6 |
| "Korean Waxing" → waxing | 3 |
| "Premium" → (dropped) | 6 |
| "Roll-On Wax" → waxing | 1 |
| "Tin Wax" → waxing | 1 |
| "Premium Waxing" → waxing | 1 |
| "Skin Brightening" → facials | 4 |
| "Wedding Packages" → wedding | 3 |

The "Shadadi" typo is now "Shaadi packages". Spa no longer lists two hair filters that were copied into it by mistake. A service with no valid filter appears under its category's first filter.

## Prices (rule 4)
Before-prices that weren't higher than the price were dropped (no fake discount is shown):
- None

## Durations (rule 3)
Ranges use the upper bound, so a professional is never booked too tightly:
- women/korean-luxe-mani-pedi/standard: "75–90 mins" → 90 min (upper bound)
- women/o3-plus-mani-pedi/standard: "75–90 mins" → 90 min (upper bound)
- women/sara-mani-pedi/standard: "70–80 mins" → 80 min (upper bound)
- women/classic-pedicure/standard: "45–50 mins" → 50 min (upper bound)
- women/ice-cream-pedicure/standard: "50–55 mins" → 55 min (upper bound)
- women/o3-plus-pedicure/standard: "50–60 mins" → 60 min (upper bound)
- women/sara-pedicure/standard: "50–55 mins" → 55 min (upper bound)
- women/cut-file-polish-hands/standard: "15–20 mins" → 20 min (upper bound)
- women/nail-paint-apply/standard: "10–15 mins" → 15 min (upper bound)
- women/bubble-jelly-foot-soak/standard: "10–15 mins" → 15 min (upper bound)
- women/eyebrows-threading/standard: "5–10 mins" → 10 min (upper bound)
- women/upper-lip-threading/standard: "5–10 mins" → 10 min (upper bound)
- women/korean-body-polishing/standard: "75–90 mins" → 90 min (upper bound)
- women/korean-full-body-scrub/standard: "45–60 mins" → 60 min (upper bound)
- women/half-body-scrub/standard: "30–35 mins" → 35 min (upper bound)
- women/full-hand-scrub/standard: "20–25 mins" → 25 min (upper bound)
- women/full-leg-scrub/standard: "20–25 mins" → 25 min (upper bound)
- women/bleach-face-neck/standard: "20–25 mins" → 25 min (upper bound)
- women/bleach-face-only/standard: "15–20 mins" → 20 min (upper bound)
- women/D-detan-face/standard: "20–25 mins" → 25 min (upper bound)
- women/3-in-1-led-night-therapy-mask/standard: "10–15 mins (add-on)" → 15 min (upper bound)
- women/charcoal-algae-peel-off-mask/standard: "20–25 mins" → 25 min (upper bound)

No duration in the old data, set to 30 minutes. **Client: please confirm.**
- women/wedding-glamm-pack/standard: no duration, set to 30 min
- women/top-to-toe-glow/standard: no duration, set to 30 min
- women/shaadi-diva-essential/standard: no duration, set to 30 min
- women/korean-waxing-ritual/standard: no duration, set to 30 min
- women/rica-gold-roll-on/standard: no duration, set to 30 min
- women/stripless-korean-bikini-wax/standard: no duration, set to 30 min
- women/shade-k-glow/standard: no duration, set to 30 min
- women/korean-hydraglow-facial/standard: no duration, set to 30 min
- women/korean-waxing-ritual-full/standard: no duration, set to 30 min
- women/korean-lukes-cleanup/standard: no duration, set to 30 min
- women/korean-mani-pedi/standard: no duration, set to 30 min
- women/korean-hydra-update/standard: no duration, set to 30 min
- women/hot-pet-sheet/standard: no duration, set to 30 min
- women/face-massage-addon/standard: no duration, set to 30 min

## Images (rule 6)
- **Bundled photos re-hosted** as AVIF/WebP: 0
- **Stock photos re-hosted** (Pexels/Unsplash): 10. Free licences, but they don't match each other. **Replace them with your own photography.**
- **No usable photo** (the card shows the neutral tile with the name):

| Reason | Services |
|---|---|
| no image | 31 |
| placeholder image | 8 |
| missing file | 33 |
| AI-generated render (watermark) | 7 |
| retired source.unsplash.com link | 14 |
| stock photo repeated on more than 2 services | 91 |

Category photos:
- From real photos: `hair.jpg`, `makeup.jpg`, `spa.jpg`, `maleGrooming.jpg` and the barber photo.
- `female-spa.png` is not used: it is AI-generated, so "Spa for women" shows the neutral tile until a real photo arrives.
- Not used: the men's massage renders (`src/asset/men/*.png`) are AI-generated and carry the generator's watermark. `image.png` and `download.png` are vector illustrations. Plan B6 rules out both.
- Three men's categories show the neutral tile until real photos arrive.
- The home page hero is `mehndi.jpg` (a real photograph), built by `node scripts/images/hero.mjs`.

## Hindi (rule 7)
Category and filter names have Hindi. Service text is English with Hindi empty, flagged "Missing Hindi" in the admin. A first-draft translation of service names and summaries is loaded from `apps/api/seed/hindi-drafts.json` when present, for a native speaker to review (assumption A14).

## Skills (rule 8)
| Category | Skill a professional needs |
|---|---|
| salon-for-women | salon_women |
| makeup-and-styling | makeup |
| hair-styling | hair_women |
| spa-for-women | spa_women |
| men-stress-relief | massage_men |
| men-pain-relief | massage_men |
| men-skincare-scrubs | skincare_men |
| men-grooming | grooming_men |
| men-face-grooming | skincare_men |

## Not migrated
Legacy ratings and booking counts aren't carried over: they weren't real reviews. Ratings return from real reviews (Phase 7).
