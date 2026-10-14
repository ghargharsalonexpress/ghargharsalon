# Catalog audit

Generated 2026-10-05 by `node scripts/catalog/audit.mjs` from `src/store/data`. Read-only; rerun after any data change.

## Summary
|  | Women | Men |
|---|---|---|
| Categories | 4 | 5 |
| Service entries | 195 | 21 |
| Unique service ids | 179 | 21 |
| Entries with price tiers | 13 | 0 |
| Entries with ratings | 68 | 21 |

Price tiers: 56 tiers across 13 services. Ratings present on 87 entries (not shown anywhere today). Single prices range from ₹25 to ₹16794.

## Categories
| Gender | Id | Name | Services | Filters |
|---|---|---|---|---|
| women | `salon_for_women` | Salon for Women | 119 | `Shadadi Packages`, `K-Rituals`, `Facials`, `Waxing`, `Manicure & Pedicure`, `Scrubs`, `Threading`, `Bleach`, `korean Glow`, `Hair Services`, `InstaLight Pack`, `Body Polishing`, `Cleanup`, `Bleach and Detan` |
| women | `makeup_and_styling` | Makeup & Styling | 25 | `Party Makeup`, `Eye Makeup`, `Best Packages`, `Wedding`, `Hair Styling`, `Engagement Makeup`, `Bridal Makeup` |
| women | `hairstyling` | Hair Cut & Style | 18 | `Haircut Services`, `Creative Hair Services`, `Mom & Daughter Packages`, `Blow-Dry`, `Temporary Hair Straightening`, `Hair Curls and Wave`, `Hair Care Services` |
| women | `spa_for_women` | Spa for Women | 33 | `Spa Bestseller`, `Stress Relief`, `Pain Relief`, `Body Ritual`, `Skin Care & Scrubs`, `Post-Natal Massage`, `Add-Ons`, `Top-Up`, `Temporary Hair Straightening`, `Hair Curls and Wave` |
| men | `stress_relief` | Stress Relief | 4 | `All` |
| men | `pain_relief` | Pain Relief | 6 | `All` |
| men | `skincare_scrubs` | Skincare & Scrubs | 5 | `All` |
| men | `monthly_necessity` | Monthly Necessity | 3 | `All` |
| men | `face_grooming` | Face Grooming | 3 | `All` |

## Identity problems
- Entries without an id: 0
- Ids repeated within the same gender: 14
- Ids used by both women and men: 3

### Duplicate ids (same gender)
| Id | Gender | Occurrences (category) |
|---|---|---|
| `stripless-korean-bikini-wax` | women | salon_for_women, salon_for_women, salon_for_women |
| `korean-glow-facial` | women | salon_for_women, salon_for_women |
| `classic-pedicure` | women | salon_for_women, salon_for_women |
| `ice-cream-pedicure` | women | salon_for_women, salon_for_women |
| `sara-pedicure` | women | salon_for_women, salon_for_women |
| `nail-paint-apply` | women | salon_for_women, salon_for_women |
| `bubble-jelly-foot-soak` | women | salon_for_women, salon_for_women |
| `korean-body-polishing` | women | salon_for_women, salon_for_women |
| `korean-full-body-scrub` | women | salon_for_women, spa_for_women |
| `full-hand-scrub` | women | salon_for_women, salon_for_women |
| `full-leg-scrub` | women | salon_for_women, salon_for_women, spa_for_women |
| `henna-application` | women | salon_for_women, hairstyling |
| `eyebrows-threading-addon` | women | salon_for_women, salon_for_women |
| `full-body-swedish-massage` | women | spa_for_women, spa_for_women |

### Ids shared by women and men
| Id | Where |
|---|---|
| `foot-reflexology` | women/spa_for_women, men/stress_relief |
| `sports-therapy` | women/spa_for_women, men/pain_relief |
| `full-back-scrub` | women/spa_for_women, men/skincare_scrubs |

## Field names
Every key used on service objects, with how many entries use it:

| Field | Women | Men |
|---|---|---|
| `FAQs` | 3 | 0 |
| `after_care` | 99 | 21 |
| `aftercare` | 3 | 0 |
| `avatar` | 136 | 21 |
| `avatars` | 9 | 0 |
| `bannerImage` | 87 | 0 |
| `belongs_to` | 195 | 21 |
| `benefits` | 14 | 0 |
| `bookings` | 57 | 21 |
| `discountPercent` | 156 | 21 |
| `duration` | 173 | 21 |
| `faq` | 91 | 21 |
| `features` | 60 | 21 |
| `gender` | 76 | 21 |
| `hasTiers` | 14 | 0 |
| `id` | 195 | 21 |
| `image` | 44 | 21 |
| `miniAvatar` | 140 | 0 |
| `oldPrice` | 156 | 21 |
| `overview` | 121 | 21 |
| `precautions` | 3 | 0 |
| `premium` | 10 | 0 |
| `price` | 182 | 21 |
| `procedure` | 3 | 0 |
| `products_and_brand` | 6 | 0 |
| `products_used` | 13 | 0 |
| `ratings` | 68 | 21 |
| `recommendedFor` | 7 | 0 |
| `recommended_for` | 31 | 0 |
| `startsFrom` | 13 | 0 |
| `subtitle` | 156 | 21 |
| `things_to_know` | 137 | 21 |
| `tiers` | 13 | 0 |
| `title` | 195 | 21 |
| `withFilter` | 195 | 21 |

### Same meaning, different names
| Variant A | Uses | Variant B | Uses |
|---|---|---|---|
| `after_care` | 120 | `aftercare` | 3 |
| `faq` | 112 | `FAQs` | 3 |
| `recommendedFor` | 7 | `recommended_for` | 31 |
| `products_used` | 13 | `products_and_brand` | 6 |
| `bannerImage` | 87 | `bannerIMage` | 0 |

### Shapes
| Field | Shape | Entries |
|---|---|---|
| overview | `{title,desc}[]` | 112 |
| overview | `absent` | 74 |
| overview | `string[]` | 30 |
| faq / FAQs | `{question,answer}[]` | 64 |
| faq / FAQs | `string[]` | 51 |
| faq / FAQs | `absent` | 101 |

### `gender` field
| Catalog: value | Entries |
|---|---|
| `women: F` | 76 |
| `women: (missing)` | 119 |
| `men: M` | 21 |

## Filters
`withFilter` values that are not in their category's filter list (these services never show under any filter chip):

| Category: value | Entries |
|---|---|
| `women/hairstyling: Hair Cut Services` | 1 |
| `women/makeup_and_styling: Wedding Packages` | 3 |
| `women/salon_for_women: Bikini Wax` | 1 |
| `women/salon_for_women: HydraGlo Facials` | 1 |
| `women/salon_for_women: Korean Glow` | 9 |
| `women/salon_for_women: Korean Waxing` | 3 |
| `women/salon_for_women: Other` | 8 |
| `women/salon_for_women: Premium Waxing` | 1 |
| `women/salon_for_women: Premium` | 7 |
| `women/salon_for_women: Roll-On Wax` | 1 |
| `women/salon_for_women: Shade Packages` | 1 |
| `women/salon_for_women: Skin Brightening` | 4 |
| `women/salon_for_women: Tin Wax` | 1 |

## Prices
- shade-k-glow: discountPercent 51% but prices imply 32%
- bubble-jelly-foot-soak: discountPercent 40% but prices imply 50%
- eyebrows-threading-addon: discountPercent 38% but prices imply 29%
- o3-plus-d10-cleanup: discountPercent 30% but prices imply 14%
- led-light-therapy-mask: discountPercent 16% but prices imply 97%
- face-neck-massage-addon: discountPercent 56% but prices imply 46%
- eyebrows-threading-addon: discountPercent 38% but prices imply 29%
- upperlip-threading-addon: discountPercent 38% but prices imply 29%
- wedding_basic_5: discountPercent 53% but prices imply 51%

### Tier problems
- full-body-swedish-massage: tier full-body-swedish-1session oldPrice < price
- deep-tissue-therapy: tier deep-tissue-1session oldPrice < price
- head-to-toe-pain-relief: tier pain-relief-1session oldPrice < price
- balinese-knees-massage: tier balinese-1session oldPrice < price
- jet-lag-relief: tier jetlag-1session oldPrice < price
- swedish-stress-relief: tier stress-1session oldPrice < price

## Durations
Durations are free text today. Parse result (service durations and tier durations):

| Result | Count |
|---|---|
| missing | 17 |
| ok | 217 |
| range | 22 |
| multi-session | 3 |

Values that need a decision during migration:

| Value | Count |
|---|---|
| `multi-session: 2 × 60 minutes` | 1 |
| `multi-session: 4 × 60 minutes` | 1 |
| `multi-session: 6 × 60 minutes` | 1 |
| `range: 10–15 mins (add-on)` | 1 |
| `range: 10–15 mins` | 2 |
| `range: 15–20 mins` | 2 |
| `range: 20–25 mins` | 5 |
| `range: 30–35 mins` | 1 |
| `range: 45–50 mins` | 1 |
| `range: 45–60 mins` | 1 |
| `range: 50–55 mins` | 2 |
| `range: 50–60 mins` | 1 |
| `range: 5–10 mins` | 2 |
| `range: 70–80 mins` | 1 |
| `range: 75–90 mins` | 3 |

## Images
| Image reference type | Count |
|---|---|
| empty | 259 |
| remote (images.unsplash.com) | 59 |
| remote (images.pexels.com) | 53 |
| public file (missing) | 39 |
| retired source.unsplash.com | 20 |
| remote (placehold.co) | 9 |
| bundled asset (src/asset) | 7 |
| remote (via.placeholder.com) | 2 |
| absolute path on a developer machine | 1 |

Services with no primary image (`image`, `avatar` or `miniAvatar`): 33.

## Language
No Devanagari (Hindi) text exists. Every Hindi field must be written during content work.

## Migration rules (input to Phase 3)
1. Give every service a stable, unique `slug`. Merge exact duplicates; rename ids that collide between women and men (prefix by gender only where needed).
2. Normalise field names: `aftercare`, `faq` as `{question, answer}[]`, `recommendedFor`, `products`, `overview` as `{title, desc}[]`. Drop `bannerIMage`/`bannerImage`, `bookings`, `features` when empty.
3. Store durations as integer minutes per tier. Multi-session packages become tiers with `sessions` and `durationMin` per session.
4. Prices become integer paise. `oldPrice` becomes `compareAtPaise` only when it is greater than the price; recompute discounts instead of storing them.
5. Fix filter values against the category's filter list (for example the "Shadadi" typo); a service with no valid filter appears under the category's first filter.
6. Re-host bundled images on S3 in AVIF/WebP sizes; any missing, retired or developer-machine image becomes `null` and shows the neutral placeholder until the client supplies a photo.
7. Every text field becomes `{ en, hi }` with `hi` empty and flagged "missing Hindi" in the admin panel.
8. Map each category to the skills a professional needs, so matching can check `requiredSkills`.

