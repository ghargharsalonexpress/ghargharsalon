// src/data/servicesData.js
export const commonWaxingFAQ = [
  {
    question: "Why is waxing better than shaving?",
    answer: "Waxing removes hair from the root, giving smoother skin for longer with finer regrowth."
  },
  {
    question: "How often should I get waxed?",
    answer: "Most people prefer waxing every 3–4 weeks depending on hair growth."
  },
  {
    question: "Is it important to moisturise after waxing?",
    answer: "Yes, moisturiser soothes skin and prevents dryness or irritation."
  },
  {
    question: "Why is AC recommended during waxing?",
    answer: "Cooler temperature prevents sweat, which helps wax adhere better and reduces discomfort."
  },
  {
    question: "What if there is redness after waxing?",
    answer: "Mild redness is normal and fades in a few hours. Applying a soothing gel helps."
  }
];

export const woman = {
  "categories": [
    {
      "id": "salon_for_women",
      "name": "Salon for Women",
      "filters": [
        "All",
        "Shadadi Packages",
        "Facials",
        "Waxing",
        "Manicure & Pedicure",
        "Scrubs",
        "Threading",
        "Bleach",
        "korean Glow",
        "Hair Services"
      ],
      "packages": [
        {
          "id": "wedding-glamm-pack",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other",
            "Shadadi Packages",
          ],
          "title": "Wedding Glamm Pack",
          "subtitle": "Korean Glow Facial + Gold Roll-On Waxing + Threading",
          "image": "https://plus.unsplash.com/premium_photo-1683865776032-07bf70b0add1?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          "price": 1998,
          "oldPrice": 3999,
          "discountPercent": 50,
          "duration": "",
          "bookings": "",
          "avatar":"https://plus.unsplash.com/premium_photo-1683865776032-07bf70b0add1?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.75,
            "count": 3146
          },
          "overview": [
            {
              "title": "Facial",
              "desc": "Korean Glow Facial with premium products"
            },
            {
              "title": "Waxing",
              "desc": "Full Arms, Underarms & Full Legs Gold Roll-On Waxing"
            },
            {
              "title": "Threading",
              "desc": "Eyebrows threading included"
            }
          ],
          "things_to_know": [
            "AC is highly recommended for waxing.",
            "Hair should be at least 0.25 inch for waxing.",
            "Avoid bleach/detan with this facial.",
            "Korean facial kit is one-time use only.",
            "Korean bean peel-off wax is used for underarms.",
            "Steam is not included.",
            "Avoid if you have cuts or skin reactions."
          ],
          "after_care": [
            "Apply moisturiser after service.",
            "Avoid direct sun exposure for a few hours.",
            "Stay hydrated."
          ],
          "faq": [
            {
              "question": "Why is waxing better than shaving?",
              "answer": "Waxing removes hair from the root, providing smoother skin and reducing thick regrowth."
            },
            {
              "question": "Is moisturiser important after waxing?",
              "answer": "Yes, moisturiser helps calm the skin and prevents dryness."
            },
            {
              "question": "How often should I get waxed?",
              "answer": "Most people prefer waxing every 3–4 weeks depending on hair growth."
            },
            {
              "question": "Why is AC recommended during waxing?",
              "answer": "A cooler environment prevents sweat, helping wax stick better and reducing discomfort."
            },
            {
              "question": "What if redness appears after waxing?",
              "answer": "Mild redness is normal and fades within a few hours. Applying a soothing gel helps."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "korean-waxing-ritual",
          "belongs_to": ["salon_for_women"],
          "withFilter": ["Waxing", "Korean Waxing"],
          "gender": "F",

          "title": "Korean Waxing Ritual",
          "subtitle": "Premium Korean Roll-On Wax • Multiple body areas",

          "image": "",
          "avatar": "",
          "miniAvatar": "",

          "hasTiers": true,
          "startsFrom": 469,

          "tiers": [
            {
              "id": "korean-waxing-full-arms-half-legs-underarms",
              "label": "Full Arms + Half Legs + Underarms Korean Waxing",
              "price": 709,
              "oldPrice": 1449,
              "discount": 51,
              "duration": "1 hr"
            },
            {
              "id": "korean-waxing-full-body",
              "label": "Full Body Korean Waxing",
              "price": 1249,
              "oldPrice": 2499,
              "discount": 50,
              "duration": "2 hr 30 mins"
            },
            {
              "id": "korean-waxing-full-arms-underarms",
              "label": "Full Arms + Underarms Korean Waxing",
              "price": 589,
              "oldPrice": 1199,
              "discount": 51,
              "duration": "40 mins"
            },
            {
              "id": "korean-waxing-half-legs",
              "label": "Half Legs Korean Waxing",
              "price": 469,
              "oldPrice": 899,
              "discount": 48,
              "duration": "20 mins"
            },
            {
              "id": "korean-waxing-full-legs",
              "label": "Full Legs Korean Waxing",
              "price": 559,
              "oldPrice": 1099,
              "discount": 49,
              "duration": "35 mins"
            },
            {
              "id": "korean-waxing-stomach",
              "label": "Stomach Korean Waxing",
              "price": 559,
              "oldPrice": 999,
              "discount": 44,
              "duration": "35 mins"
            },
            {
              "id": "korean-waxing-full-arms",
              "label": "Full Arms Korean Waxing",
              "price": 559,
              "oldPrice": 999,
              "discount": 44,
              "duration": "35 mins"
            },
            {
              "id": "korean-waxing-full-back",
              "label": "Full Back Korean Waxing",
              "price": 589,
              "oldPrice": 999,
              "discount": 41,
              "duration": "40 mins"
            },
            {
              "id": "korean-waxing-half-back",
              "label": "Half Back Korean Waxing",
              "price": 469,
              "oldPrice": 899,
              "discount": 48,
              "duration": "20 mins"
            },
            {
              "id": "korean-waxing-half-arm",
              "label": "Half Arms Korean Waxing",
              "price": 469,
              "oldPrice": 899,
              "discount": 48,
              "duration": "20 mins"
            }
          ],

          "overview": [
            { "title": "Premium Wax", "desc": "Smooth Korean roll-on wax for painless hair removal" },
            { "title": "Hygienic", "desc": "Single-use applicators with clean protocols" },
            { "title": "Fast & Effective", "desc": "Quick service with long-lasting results" }
          ],

          "things_to_know": [
            "Hair length must be at least 0.25 inch for proper waxing.",
            "Avoid moisturiser, scrub, or lotion before the session.",
            "AC environment recommended for comfort and better waxing grip."
          ],

          "after_care": [
            "Avoid sun exposure for 24 hours.",
            "Do not scrub or exfoliate for 48 hours.",
            "Apply aloe vera gel or calming lotion to soothe skin."
          ],

          "faq": [
            {
              "question": "Is Korean waxing less painful?",
              "answer": "Yes, the roll-on wax glides smoothly and reduces the pull discomfort."
            },
            {
              "question": "How long do results last?",
              "answer": "Usually 3–4 weeks depending on hair growth."
            },
            {
              "question": "Is it suitable for sensitive skin?",
              "answer": "Yes, Korean wax is formulated to reduce irritation."
            }
          ]
        },
        {
          "id": "top-to-toe-glow",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials",
            "Shadadi Packages"
          ],
          "title": "Top To Toe Glow",
          "subtitle": "Korean Body Polishing + Head Massage",
          "image": "https://source.unsplash.com/400x400/?spa,bodypolish",
          "price": 1696,
          "oldPrice": 3399,
          "discountPercent": 50,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.72,
            "count": 42585
          },
          "overview": [
            {
              "title": "Body Polishing",
              "desc": "Full-body Korean polishing"
            },
            {
              "title": "Massage",
              "desc": "Relaxing head massage included"
            }
          ],
          "things_to_know": [
            "Kit is one-time use only.",
            "Skincare goodies will be handed over.",
            "Steps repeated for all body parts except face.",
            "Avoid if pregnant or breastfeeding.",
            "Avoid during IVF/IUI or dermatological treatments."
          ],
          "after_care": [
            "Exfoliate once a week.",
            "Wear sunscreen daily.",
            "Hydrate thoroughly."
          ],
          "faq": [
            {
              "question": "Is moisturiser important after the service?",
              "answer": "Yes, it helps maintain softness and prevents dryness."
            },
            {
              "question": "Can I go out in the sun after body polishing?",
              "answer": "Avoid direct sun exposure for a few hours and apply sunscreen."
            },
            {
              "question": "Is the kit hygienic?",
              "answer": "Yes, all materials are single-use for hygiene and safety."
            },
            {
              "question": "How often should I get body polishing?",
              "answer": "Once every 3–4 weeks is ideal depending on skin needs."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "shaadi-diva-essential",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Shadadi Packages"
          ],
          "title": "Shaadi Diva Essential",
          "subtitle": "Vitamin-C Clean-Up + Honey Wax + Threading",
          "image": "https://source.unsplash.com/400x400/?cleanup,beauty",
          "price": 1198,
          "oldPrice": 2499,
          "discountPercent": 52,
          "duration": "",
          "bookings": "",
          "miniAvatar":"https://plus.unsplash.com/premium_photo-1683865776032-07bf70b0add1?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.75,
            "count": 1959
          },
          "overview": [
            {
              "title": "Clean-Up",
              "desc": "Vitamin-C brightening cleanup"
            },
            {
              "title": "Waxing",
              "desc": "Full Arms, Underarms & Full Legs Honey Wax"
            },
            {
              "title": "Threading",
              "desc": "Eyebrows & Upper Lips threading"
            }
          ],
          "things_to_know": [
            "AC recommended for waxing.",
            "Hair should be 0.25 inch for waxing.",
            "Vitamin-C kit is one-time use only.",
            "Honey wax is one-time use only.",
            "Steam is not included.",
            "Avoid if you have sensitive skin issues."
          ],
          "after_care": [
            "Avoid harsh products for 24 hours.",
            "Apply moisturiser daily.",
            "Avoid direct sunlight for a few hours."
          ],
          "faq": [
            {
              "question": "Does Vitamin-C cleanup suit all skin types?",
              "answer": "Yes, it is mild and suitable for most skin types."
            },
            {
              "question": "Is moisturiser required after waxing?",
              "answer": "Yes, it helps soothe freshly waxed skin."
            },
            {
              "question": "How often can I get this cleanup?",
              "answer": "Every 2–3 weeks depending on your skin type."
            },
            {
              "question": "Why is AC recommended?",
              "answer": "Wax adheres better when the skin is dry and cool."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "korean-waxing-ritual",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Korean Waxing Ritual - Full Arms + Full Legs + Underarms",
          "subtitle": "",
          "image": "https://source.unsplash.com/400x400/?waxing,korean",
          "price": 799,
          "oldPrice": 1699,
          "discountPercent": 52,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": null,
            "count": null
          },
          "overview": [
            {
              "title": "Waxing Kit",
              "desc": "Disposable kit included"
            },
            {
              "title": "3-Step Ritual",
              "desc": "Scrub, Gel Wax, Post-wax lotion"
            }
          ],
          "things_to_know": [],
          "after_care": [],
          "faq": [
            {
              "question": "Why is waxing better than shaving?",
              "answer": "Waxing removes hair from the root, resulting in smoother and longer-lasting results."
            },
            {
              "question": "How often should I get waxed?",
              "answer": "Every 3–4 weeks is ideal for most people."
            },
            {
              "question": "Why is AC recommended during waxing?",
              "answer": "A cooler environment helps reduce sweating, improving wax application."
            },
            {
              "question": "Is moisturiser needed after waxing?",
              "answer": "Yes, it helps soothe the skin and reduce irritation."
            },
            {
              "question": "What if redness appears?",
              "answer": "This is normal and fades within a few hours."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "rica-gold-roll-on",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Rica Gold Roll On - Full Arms + Full Legs + Underarms",
          "subtitle": "",
          "image": "https://source.unsplash.com/400x400/?rica,waxing",
          "price": 849,
          "oldPrice": 1799,
          "discountPercent": 52,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": null,
            "count": 77
          },
          "overview": [
            {
              "title": "Roll-On System",
              "desc": "Cleaner and quicker waxing application"
            }
          ],
          "things_to_know": [],
          "after_care": [],
          "faq": [
            {
              "question": "How is roll-on wax better?",
              "answer": "It offers cleaner application with controlled wax flow."
            },
            {
              "question": "Is waxing better than shaving?",
              "answer": "Yes, waxing pulls hair from the root for smoother results."
            },
            {
              "question": "Do I need moisturiser?",
              "answer": "Yes, it reduces irritation and keeps skin soft."
            },
            {
              "question": "How often should waxing be done?",
              "answer": "Every 3–4 weeks."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "stripless-korean-bikini-wax",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Stripless Korean Bikini Wax",
          "subtitle": "One-Time Use Peel-Off Wax",
          "image": "https://source.unsplash.com/400x400/?bikini,wax",
          "price": 749,
          "oldPrice": 1499,
          "discountPercent": 50,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.73,
            "count": 35377
          },
          "overview": [
            {
              "title": "Peel-Off Wax",
              "desc": "Designed for sensitive bikini area"
            }
          ],
          "things_to_know": [],
          "after_care": [],
          "faq": [
            {
              "question": "Is bikini waxing safe?",
              "answer": "Yes, when professional peel-off wax is used."
            },
            {
              "question": "How often should bikini waxing be done?",
              "answer": "Every 4–6 weeks."
            },
            {
              "question": "Does it cause redness?",
              "answer": "Mild redness is normal and temporary."
            },
            {
              "question": "Do I need to bring anything?",
              "answer": "No, all materials are provided."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "first-korean-hydra-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials",
            "korean Glow"
          ],
          "title": "First Korean Hydra Facial",
          "subtitle": "Deep hydration with Korean-inspired glow boost",
          "image": "https://source.unsplash.com/400x400/?facial,korean",
          "price": 1742,
          "oldPrice": 2489,
          "discountPercent": 30,
          "duration": "55 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.78,
            "count": 2140
          },
          "overview": [
            {
              "title": "Intense Hydration",
              "desc": "Replenishes skin moisture with multi-step Korean hydrating actives."
            },
            {
              "title": "Glow Enhancer",
              "desc": "Softens texture and boosts natural luminosity."
            }
          ],
          "things_to_know": [
            "Ideal for dry, dull and fatigued skin.",
            "Avoid if you have active skin infections or cuts.",
            "Not recommended immediately after waxing or threading."
          ],
          "after_care": [
            "Do not wash your face for at least 2 hours.",
            "Avoid direct sun exposure and always apply SPF.",
            "Skip exfoliation or scrubs for 24 hours."
          ],
          "faq": [
            {
              "question": "Is this suitable for very dry skin?",
              "answer": "Yes, this facial is designed to deeply hydrate and comfort dehydrated skin."
            },
            {
              "question": "How often should I get this facial?",
              "answer": "Every 3–4 weeks is ideal for maintaining hydration and glow."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "insta-cologne-boost-hydra-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Insta Cologne Boost Hydra Facial",
          "subtitle": "Instant freshness with cooling hydration",
          "image": "https://source.unsplash.com/400x400/?facial,hydra",
          "price": 1427,
          "oldPrice": 2039,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.75,
            "count": 1895
          },
          "overview": [
            {
              "title": "Cooling Fresh Effect",
              "desc": "Gives a cologne-like fresh, energized feel to tired skin."
            },
            {
              "title": "Moisture Barrier Care",
              "desc": "Hydrates without making the skin greasy or heavy."
            }
          ],
          "things_to_know": [
            "Best suited for normal to combination skin.",
            "Mild fragrance is present in products used.",
            "Not recommended for extremely sensitive or allergy-prone skin."
          ],
          "after_care": [
            "Avoid using strong fragranced products on the same day.",
            "Use a light moisturiser to lock in hydration.",
            "Do not use strong actives (AHA/BHA/retinol) the same night."
          ],
          "faq": [
            {
              "question": "Does this facial feel very cooling?",
              "answer": "Yes, it gives a refreshing, cooling after-effect without irritation for most skin types."
            },
            {
              "question": "Is it okay for oily skin?",
              "answer": "Yes, it hydrates without making the skin overly oily."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "hydration-boost-hydra-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Hydration Boost Hydra Facial",
          "subtitle": "Moisture-repair facial for thirsty skin",
          "image": "https://source.unsplash.com/400x400/?facial,hydration",
          "price": 1400,
          "oldPrice": 2000,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.76,
            "count": 2050
          },
          "overview": [
            {
              "title": "Moisture Lock",
              "desc": "Replenishes moisture reserves and improves skin plumpness."
            },
            {
              "title": "Barrier Support",
              "desc": "Helps strengthen the skin barrier for long-lasting hydration."
            }
          ],
          "things_to_know": [
            "Perfect before events where makeup is to be applied.",
            "Not recommended on broken or peeling skin.",
            "Safe for most skin types including mildly sensitive."
          ],
          "after_care": [
            "Avoid hot water on the face for a few hours.",
            "Use a gentle cleanser and hydrating moisturiser.",
            "Apply SPF 30+ in the daytime."
          ],
          "faq": [
            {
              "question": "Is this facial good before a function?",
              "answer": "Yes, it provides a smooth, hydrated base for makeup."
            },
            {
              "question": "Will it make my skin oily?",
              "answer": "No, hydration is balanced and non-greasy."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "korean-glow-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Korean Glow Facial",
          "subtitle": "Glass-skin inspired dewy glow facial",
          "image": "https://source.unsplash.com/400x400/?korean,glow",
          "price": 910,
          "oldPrice": 1300,
          "discountPercent": 30,
          "duration": "45 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.8,
            "count": 3210
          },
          "overview": [
            {
              "title": "Glow Boost",
              "desc": "Targets dullness and uneven texture for a soft, luminous finish."
            },
            {
              "title": "K-Beauty Steps",
              "desc": "Inspired by Korean layering technique for hydration and radiance."
            }
          ],
          "things_to_know": [
            "Gentle enough for most skin types.",
            "Avoid if you have active, painful acne.",
            "No bleach used in this service."
          ],
          "after_care": [
            "Skip makeup for at least 4–6 hours.",
            "Use a hydrating toner and moisturiser.",
            "Avoid harsh scrubs for 24 hours."
          ],
          "faq": [
            {
              "question": "Will I see immediate glow?",
              "answer": "Yes, most clients see instant radiance and smoothness after the service."
            },
            {
              "question": "Is it suitable for sensitive skin?",
              "answer": "Yes, but always inform the beautician about past reactions."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "o3-plus-shine-glow-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "O3 Plus Shine and Glow Facial",
          "subtitle": "Salon-grade O3+ facial for shine and brightness",
          "image": "https://source.unsplash.com/400x400/?facial,spa",
          "price": 944,
          "oldPrice": 1349,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.77,
            "count": 1879
          },
          "overview": [
            {
              "title": "O3+ Formula",
              "desc": "Uses O3+ products that help brighten and revive skin tone."
            },
            {
              "title": "Event Ready Glow",
              "desc": "Leaves skin smooth and photo-ready."
            }
          ],
          "things_to_know": [
            "Ideal as a pre-function facial.",
            "Inform the beautician if you have very sensitive skin.",
            "Mild tingling may be felt during pack application."
          ],
          "after_care": [
            "Do not use any other facial pack the same day.",
            "Avoid direct sunlight for a few hours.",
            "Always use sunscreen outdoors."
          ],
          "faq": [
            {
              "question": "Does it use bleach?",
              "answer": "No, O3+ facials do not involve bleach."
            },
            {
              "question": "How long does the glow last?",
              "answer": "With basic skin care, glow can last 7–10 days."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "vitamin-c-brightening-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Vitamin C Brightening Facial",
          "subtitle": "Glow-boosting facial with Vitamin C actives",
          "image": "https://source.unsplash.com/400x400/?vitaminc,facial",
          "price": 560,
          "oldPrice": 800,
          "discountPercent": 30,
          "duration": "40 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.73,
            "count": 2590
          },
          "overview": [
            {
              "title": "Tan & Dullness Care",
              "desc": "Helps reduce mild tan and brighten tired-looking skin."
            },
            {
              "title": "Antioxidant Support",
              "desc": "Vitamin C supports skin’s natural defense against damage."
            }
          ],
          "things_to_know": [
            "Not recommended if you are already using strong Vitamin C serums.",
            "Mild tingling may occur and is normal.",
            "Avoid on very irritated or peeling skin."
          ],
          "after_care": [
            "Use gentle, non-exfoliating cleanser.",
            "Avoid AHA/BHA or retinol for at least 24 hours.",
            "Apply sunscreen daily to maintain results."
          ],
          "faq": [
            {
              "question": "Is this good for pigmented skin?",
              "answer": "It can help with overall brightness, but is not a medical treatment for pigmentation."
            },
            {
              "question": "Can I do this monthly?",
              "answer": "Yes, once every 3–4 weeks works well for most clients."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "skin-tightening-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Skin Tightening Facial",
          "subtitle": "Firming facial for improved elasticity",
          "image": "https://source.unsplash.com/400x400/?firming,facial",
          "price": 560,
          "oldPrice": 800,
          "discountPercent": 30,
          "duration": "45 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 1720
          },
          "overview": [
            {
              "title": "Firm Look",
              "desc": "Gives a firmer, lifted appearance to tired-looking skin."
            },
            {
              "title": "Collagen Support",
              "desc": "Uses firming massage and packs to support skin elasticity."
            }
          ],
          "things_to_know": [
            "Best suited for 25+ age group.",
            "Does not replace clinical tightening treatments.",
            "Avoid if you have very sensitive or reactive skin."
          ],
          "after_care": [
            "Do not sleep immediately with heavy makeup.",
            "Use a nourishing night cream.",
            "Stay hydrated for better results."
          ],
          "faq": [
            {
              "question": "Will it remove wrinkles?",
              "answer": "It softens the appearance of fine lines but does not permanently remove wrinkles."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "d10-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "D10 Facial",
          "subtitle": "Detan and brightening facial for sun-exposed skin",
          "image": "https://source.unsplash.com/400x400/?detan,facial",
          "price": 560,
          "oldPrice": 800,
          "discountPercent": 30,
          "duration": "40 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.72,
            "count": 1984
          },
          "overview": [
            {
              "title": "Tan Reduction",
              "desc": "Targets mild to moderate tanning from daily sun exposure."
            }
          ],
          "things_to_know": [
            "Not suitable for very sensitive skin.",
            "Avoid on skin with active rashes or cuts.",
            "May cause mild tingling during mask step."
          ],
          "after_care": [
            "Avoid sun exposure on the same day as much as possible.",
            "Use sunscreen generously the next morning.",
            "Skip any harsh exfoliator for 24 hours."
          ],
          "faq": [
            {
              "question": "Is this a bleach facial?",
              "answer": "No, this is a detan facial without bleach."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "exotic-fruit-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Exotic Fruit Facial",
          "subtitle": "Gentle glow with fruit enzyme care",
          "image": "https://source.unsplash.com/400x400/?fruit,facial",
          "price": 560,
          "oldPrice": 800,
          "discountPercent": 30,
          "duration": "40 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.69,
            "count": 1675
          },
          "overview": [
            {
              "title": "Soft Glow",
              "desc": "Fruit-based actives help refine texture and add a fresh glow."
            }
          ],
          "things_to_know": [
            "Suitable for normal to dry skin.",
            "Avoid if you have known allergy to fruit enzymes.",
            "Very gentle compared to strong peel facials."
          ],
          "after_care": [
            "Use mild skincare for the next 24 hours.",
            "Avoid trying new actives immediately after.",
            "Keep skin moisturised."
          ],
          "faq": [
            {
              "question": "Is this facial good for beginners?",
              "answer": "Yes, it’s a mild, beginner-friendly glow facial."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "golden-glow-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Golden Glow Facial",
          "subtitle": "Radiant glow facial for special occasions",
          "image": "https://source.unsplash.com/400x400/?gold,facial",
          "price": 840,
          "oldPrice": 1200,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.82,
            "count": 3380
          },
          "overview": [
            {
              "title": "Bridal-style Glow",
              "desc": "Gives a rich, luminous finish ideal for events and celebrations."
            }
          ],
          "things_to_know": [
            "Perfect as a pre-function facial.",
            "Avoid immediately after any peeling treatment.",
            "Mention if you have extremely sensitive skin."
          ],
          "after_care": [
            "Keep makeup light on the same day if possible.",
            "Do not use harsh scrubs for 24 hours.",
            "Use sunscreen daily."
          ],
          "faq": [
            {
              "question": "Is this suitable for all skin types?",
              "answer": "Yes, but intensity can be adjusted based on your skin type."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "o3-plus-t-young-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "O3 Plus T Young Facial",
          "subtitle": "Youthful glow facial with O3+ actives",
          "image": "https://source.unsplash.com/400x400/?facial,young",
          "price": 874,
          "oldPrice": 1249,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.74,
            "count": 2044
          },
          "overview": [
            {
              "title": "Youthful Radiance",
              "desc": "Targets early signs of tiredness and loss of glow."
            }
          ],
          "things_to_know": [
            "Recommended for mid-20s and above.",
            "Not a clinical anti-ageing treatment.",
            "Safe for most skin types."
          ],
          "after_care": [
            "Use gentle night cream after service.",
            "Avoid strong peels for at least a week.",
            "Follow basic CTM routine daily."
          ],
          "faq": [
            {
              "question": "Will it remove fine lines?",
              "answer": "It softens their appearance but is not a medical anti-ageing procedure."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "berry-bomb-ice-cream-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Berry Bomb Ice Cream Facial",
          "subtitle": "Fun, soothing facial with berry goodness",
          "image": "https://source.unsplash.com/400x400/?berry,facial",
          "price": 840,
          "oldPrice": 1200,
          "discountPercent": 30,
          "duration": "45 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.71,
            "count": 1760
          },
          "overview": [
            {
              "title": "Cooling Comfort",
              "desc": "Gives a soothing, soft glow with a playful ice-cream-like experience."
            }
          ],
          "things_to_know": [
            "Great for normal to dry skin.",
            "Not recommended for very acne-prone skin.",
            "Has a mild fruity fragrance."
          ],
          "after_care": [
            "Avoid very hot water on face for some hours.",
            "Use a mild moisturiser.",
            "Do not over-exfoliate for a day."
          ],
          "faq": [
            {
              "question": "Is this more of a pampering facial?",
              "answer": "Yes, it combines pampering with a soft, visible glow."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "moroccan-argan-oil-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Moroccan Argan Oil Facial",
          "subtitle": "Nourishing facial with Moroccan argan oil",
          "image": "https://source.unsplash.com/400x400/?argan,facial",
          "price": 657,
          "oldPrice": 939,
          "discountPercent": 30,
          "duration": "45 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.79,
            "count": 2218
          },
          "overview": [
            {
              "title": "Deep Nourishment",
              "desc": "Argan oil helps soften, nourish and comfort dry skin."
            }
          ],
          "things_to_know": [
            "Ideal for dry to very dry skin.",
            "Not recommended for extremely oily, acne-prone skin.",
            "Contains natural oil, so slight richness is expected."
          ],
          "after_care": [
            "Do not use foaming cleansers immediately.",
            "Use a gentle, hydrating face wash.",
            "Avoid additional facial oils the same night."
          ],
          "faq": [
            {
              "question": "Is argan oil comedogenic?",
              "answer": "Argan oil is generally light, but very acne-prone skin should avoid heavy oils."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "ayurvedic-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "Ayurvedic Facial",
          "subtitle": "Herbal-inspired facial for balanced skin",
          "image": "https://source.unsplash.com/400x400/?ayurvedic,facial",
          "price": 699,
          "oldPrice": 999,
          "discountPercent": 30,
          "duration": "45 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.68,
            "count": 1542
          },
          "overview": [
            {
              "title": "Herbal Care",
              "desc": "Uses Ayurvedic-inspired ingredients to soothe and balance skin."
            }
          ],
          "things_to_know": [
            "Ideal for those who prefer herbal, traditional facials.",
            "Inform your therapist about any ingredient allergies.",
            "Does not use bleach or harsh chemicals."
          ],
          "after_care": [
            "Keep skincare simple and mild for a day.",
            "Avoid layering too many new products.",
            "Stay hydrated to support skin detox."
          ],
          "faq": [
            {
              "question": "Is this fully chemical-free?",
              "answer": "It is herbal-inspired; some products may still contain cosmetic bases."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "o3-plus-sondria-facial",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Facials"
          ],
          "title": "O3 Plus Sondria Facial",
          "subtitle": "O3+ Sondria range for bright, smooth skin",
          "image": "https://source.unsplash.com/400x400/?spa,facial",
          "price": 840,
          "oldPrice": 1200,
          "discountPercent": 30,
          "duration": "50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.76,
            "count": 1930
          },
          "overview": [
            {
              "title": "Refined Texture",
              "desc": "Helps refine pores and improve overall smoothness."
            }
          ],
          "things_to_know": [
            "Good for combination and normal skin types.",
            "Avoid if you have very reactive, allergy-prone skin.",
            "Slight tingling may be felt with certain O3+ products."
          ],
          "after_care": [
            "Use a calming moisturiser afterward.",
            "Avoid using multiple active serums on the same day.",
            "Apply SPF every morning to retain results."
          ],
          "faq": [
            {
              "question": "Is this a strong facial?",
              "answer": "It is effective yet balanced; the intensity can be adjusted based on your skin type."
            }
          ],
          "bannerImage": ""
        },
        {
          "id": "korean-luxe-mani-pedi",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Korean Luxe Manicure & Pedicure",
          "subtitle": "Hand & foot pampering with Korean-inspired spa steps",
          "image": "",
          "bannerImage": "",
          "price": 1000,
          "oldPrice": 1399,
          "discountPercent": 29,
          "duration": "75–90 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.8,
            "count": 1800
          },
          "overview": [
            {
              "title": "Full Hand & Foot Ritual",
              "desc": "Includes soak, exfoliation, cuticle work, massage and polish for both hands and feet."
            }
          ],
          "things_to_know": [
            "Ensure nails are free from gel/acrylic before service.",
            "Mention if you have any cuts or cracks on hands or feet."
          ],
          "after_care": [
            "Keep feet dry for some time after the service.",
            "Apply hand and foot cream regularly."
          ],
          "faq": []
        },
        {
          "id": "classic-mani-pedi-combo",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Classic Manicure & Pedicure",
          "subtitle": "Everyday hand and foot clean-up ritual",
          "image": "",
          "bannerImage": "",
          "price": 697,
          "oldPrice": 999,
          "discountPercent": 30,
          "duration": "70 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 2200
          },
          "overview": [
            {
              "title": "Essential Grooming",
              "desc": "Basic cut, file, soak, scrub and massage for hands and feet."
            }
          ],
          "things_to_know": [
            "Great as a monthly maintenance service.",
            "Nail paint application is included as per package design."
          ],
          "after_care": [
            "Avoid smudging by letting polish dry properly.",
            "Moisturise cuticles daily for best results."
          ],
          "faq": []
        },
        {
          "id": "ice-cream-mani-pedi",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Ice Cream Manicure & Pedicure",
          "subtitle": "Fun, dessert-inspired mani-pedi ritual",
          "image": "",
          "bannerImage": "",
          "price": 900,
          "oldPrice": 1299,
          "discountPercent": 31,
          "duration": "75 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 900
          },
          "overview": [
            {
              "title": "Cooling Indulgence",
              "desc": "Includes cooling soaks and creamy scrubs with a playful, spa-at-home feel."
            }
          ],
          "things_to_know": [
            "Ideal for self-care days and pamper sessions.",
            "Avoid if you are sensitive to fragrances."
          ],
          "after_care": [
            "Keep hands and feet moisturised.",
            "Avoid tight footwear immediately after a pedicure."
          ],
          "faq": []
        },
        {
          "id": "o3-plus-mani-pedi",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "O3+ Manicure & Pedicure",
          "subtitle": "Professional O3+ care for hands & feet",
          "image": "",
          "bannerImage": "",
          "price": 1178,
          "oldPrice": 1599,
          "discountPercent": 26,
          "duration": "75–90 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 750
          },
          "overview": [
            {
              "title": "Salon-Grade Products",
              "desc": "Uses O3+ professional range for deep cleansing and care."
            }
          ],
          "things_to_know": [
            "Best for those who love salon-grade mani-pedi results at home.",
            "Inform the expert if you have extremely sensitive skin."
          ],
          "after_care": [
            "Avoid chemical exposure (like detergents) without gloves.",
            "Keep nails short and clean for long-term health."
          ],
          "faq": []
        },
        {
          "id": "sara-mani-pedi",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Sara Manicure & Pedicure",
          "subtitle": "Botanical-inspired hand & foot care",
          "image": "",
          "bannerImage": "",
          "price": 800,
          "oldPrice": 1099,
          "discountPercent": 27,
          "duration": "70–80 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 600
          },
          "overview": [
            {
              "title": "Gentle Nourishment",
              "desc": "Sara products used for a mild, soothing mani-pedi experience."
            }
          ],
          "things_to_know": [
            "Good for those who prefer botanical-inspired products.",
            "Always share if you have allergies to any ingredients."
          ],
          "after_care": [
            "Use mild soap and keep hands moisturised.",
            "Reapply cuticle oil regularly."
          ],
          "faq": []
        },
        {
          "id": "korean-luxe-pedicure",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Korean Luxe Pedicure",
          "subtitle": "Spa-style Korean pedicure ritual",
          "image": "",
          "bannerImage": "",
          "price": 760,
          "oldPrice": 1049,
          "discountPercent": 28,
          "duration": "60 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 1100
          },
          "overview": [
            {
              "title": "Foot Focus",
              "desc": "Targets rough heels, dull skin and tired feet with soak, scrub and massage."
            }
          ],
          "things_to_know": [
            "Ideal for people who stand or walk a lot.",
            "Mention if you have cracked heels or infections."
          ],
          "after_care": [
            "Wear comfortable slippers after service.",
            "Moisturise feet at night and wear socks."
          ],
          "faq": []
        },
        {
          "id": "classic-pedicure",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Classic Pedicure",
          "subtitle": "Basic clean-up and relaxation for feet",
          "image": "",
          "bannerImage": "",
          "price": 500,
          "oldPrice": 699,
          "discountPercent": 28,
          "duration": "45–50 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 1300
          },
          "overview": [
            {
              "title": "Everyday Maintenance",
              "desc": "Soak, scrub, cut, file and massage for regular foot hygiene."
            }
          ],
          "things_to_know": [
            "Great as a monthly maintenance service.",
            "Avoid if you have active fungal infections."
          ],
          "after_care": [
            "Keep nails dry and clean.",
            "Avoid sharing nail tools with others."
          ],
          "faq": []
        },
        {
          "id": "ice-cream-pedicure",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Ice Cream Pedicure",
          "subtitle": "Playful, cooling pedicure ritual",
          "image": "",
          "bannerImage": "",
          "price": 599,
          "oldPrice": 849,
          "discountPercent": 29,
          "duration": "50–55 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 700
          },
          "overview": [
            {
              "title": "Cooling Comfort",
              "desc": "Soothing, cooling products with a fun ice-cream spa theme."
            }
          ],
          "things_to_know": [
            "Best suited as a pamper service.",
            "Check fragrance tolerance if you’re sensitive."
          ],
          "after_care": [
            "Let polish dry fully before wearing shoes.",
            "Hydrate feet daily with a foot cream."
          ],
          "faq": []
        },
        {
          "id": "o3-plus-pedicure",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "O3+ Pedicure",
          "subtitle": "Professional pedicure with O3+",
          "image": "",
          "bannerImage": "",
          "price": 650,
          "oldPrice": 899,
          "discountPercent": 28,
          "duration": "50–60 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 650
          },
          "overview": [
            {
              "title": "Deep Foot Care",
              "desc": "O3+ products help in thorough cleansing and softening of feet."
            }
          ],
          "things_to_know": [
            "Good for those who prefer salon-level pedicures.",
            "Always mention if you have very cracked or painful heels."
          ],
          "after_care": [
            "Avoid walking barefoot on rough surfaces.",
            "Apply heel cream at night."
          ],
          "faq": []
        },
        {
          "id": "sara-pedicure",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Manicure & Pedicure"
          ],
          "title": "Sara Pedicure",
          "subtitle": "Botanical-inspired pedicure for soft feet",
          "image": "",
          "bannerImage": "",
          "price": 560,
          "oldPrice": 799,
          "discountPercent": 30,
          "duration": "50–55 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 500
          },
          "overview": [
            {
              "title": "Gentle Foot Care",
              "desc": "Uses Sara products for a soothing, mild pedicure experience."
            }
          ],
          "things_to_know": [
            "Suitable for regular, non-problematic feet.",
            "Allergies should be clearly mentioned."
          ],
          "after_care": [
            "Keep nails clean and trimmed.",
            "Apply moisturiser daily."
          ],
          "faq": []
        },
        {
          "id": "cut-file-polish-hands",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Cut, File & Polish - Hands",
          "subtitle": "Quick nail grooming for hands",
          "image": "",
          "bannerImage": "",
          "price": 120,
          "oldPrice": 150,
          "discountPercent": 20,
          "duration": "15–20 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 900
          },
          "overview": [
            {
              "title": "Quick Fix",
              "desc": "Basic trimming, shaping and polish application for neat-looking nails."
            }
          ],
          "things_to_know": [
            "Gel/extension removal is not included.",
            "Ideal between full manicure sessions."
          ],
          "after_care": [
            "Avoid biting nails.",
            "Let polish dry fully."
          ],
          "faq": []
        },
        {
          "id": "nail-paint-apply",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "title": "Nail Paint Application",
          "subtitle": "Simple nail polish application",
          "image": "",
          "bannerImage": "",
          "price": 60,
          "oldPrice": 80,
          "discountPercent": 25,
          "duration": "10–15 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 700
          },
          "overview": [
            {
              "title": "Finishing Touch",
              "desc": "Neat nail paint application for a polished look."
            }
          ],
          "things_to_know": [
            "Does not include full manicure or pedicure steps.",
            "Carry your own shade if you prefer a specific brand."
          ],
          "after_care": [
            "Avoid smudging while drying.",
            "Use gloves while doing harsh household chores."
          ],
          "faq": []
        },
        {
          "id": "bubble-jelly-foot-soak",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "title": "Bubble Jelly Foot Soak",
          "subtitle": "Add-on relaxing jelly soak for tired feet",
          "image": "",
          "bannerImage": "",
          "price": 99,
          "oldPrice": 149,
          "discountPercent": 34,
          "duration": "10–15 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 400
          },
          "overview": [
            {
              "title": "Relaxing Add-On",
              "desc": "Soft jelly-like soak that relaxes and refreshes tired feet."
            }
          ],
          "things_to_know": [
            "Best used as an add-on to a pedicure service.",
            "Not recommended if you have open cuts or infections."
          ],
          "after_care": [
            "Dry feet thoroughly after the service.",
            "Moisturise your feet after soaking."
          ],
          "faq": []
        },
        {
          "id": "eyebrows-threading",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Threading"
          ],
          "title": "Eyebrows Threading",
          "subtitle": "Quick eyebrow shape and clean-up",
          "image": "",
          "bannerImage": "",
          "price": 30,
          "oldPrice": 40,
          "discountPercent": 25,
          "duration": "5–10 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.8,
            "count": 2500
          },
          "overview": [
            {
              "title": "Shaping & Definition",
              "desc": "Cleans extra hair and gives a defined brow shape."
            }
          ],
          "things_to_know": [
            "You can show reference pictures for preferred shape.",
            "Avoid applying makeup immediately after threading."
          ],
          "after_care": [
            "Apply aloe gel if mild redness appears.",
            "Avoid touching or rubbing the area too much."
          ],
          "faq": []
        },
        {
          "id": "upper-lip-threading",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Threading"
          ],
          "title": "Upper Lip Threading",
          "subtitle": "Quick upper lip hair removal",
          "image": "",
          "bannerImage": "",
          "price": 30,
          "oldPrice": 40,
          "discountPercent": 25,
          "duration": "5–10 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 2000
          },
          "overview": [
            {
              "title": "Neat Finish",
              "desc": "Removes upper lip hair for a clean, smooth look."
            }
          ],
          "things_to_know": [
            "Mild redness is normal and settles soon.",
            "Avoid using strong active-based creams right after."
          ],
          "after_care": [
            "You may apply aloe or calming gel.",
            "Avoid hot drinks close to the area immediately after."
          ],
          "faq": []
        },
        {
          "id": "korean-body-polishing",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Korean Body Polishing",
          "subtitle": "Full-body polishing for smooth and bright skin",
          "image": "",
          "bannerImage": "",
          "price": 1600,
          "oldPrice": 2200,
          "discountPercent": 27,
          "duration": "75–90 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.7,
            "count": 1200
          },
          "overview": [
            {
              "title": "Full Body Ritual",
              "desc": "Includes exfoliation, massage and nourishment for arms, legs and torso."
            }
          ],
          "things_to_know": [
            "Not done on the face or intimate areas.",
            "Avoid if you have active skin infections or recent waxing burns."
          ],
          "after_care": [
            "Avoid hot showers immediately after.",
            "Apply body lotion daily to maintain softness."
          ],
          "faq": []
        },
        {
          "id": "korean-full-body-scrub",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Korean Full Body Scrub",
          "subtitle": "Intense exfoliation for full body",
          "image": "",
          "bannerImage": "",
          "price": 600,
          "oldPrice": 900,
          "discountPercent": 33,
          "duration": "45–60 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.6,
            "count": 700
          },
          "overview": [
            {
              "title": "Deep Exfoliation",
              "desc": "Helps remove dead skin build-up for smoother texture."
            }
          ],
          "things_to_know": [
            "Avoid on very sensitive, sunburnt or recently waxed skin.",
            "May cause mild temporary redness."
          ],
          "after_care": [
            "Skip strong exfoliants for a week.",
            "Use a hydrating body lotion or cream."
          ],
          "faq": []
        },
        {
          "id": "half-body-scrub",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Half Body Scrub",
          "subtitle": "Focused exfoliation for either upper or lower body",
          "image": "",
          "bannerImage": "",
          "price": 319,
          "oldPrice": 449,
          "discountPercent": 29,
          "duration": "30–35 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 500
          },
          "overview": [
            {
              "title": "Targeted Care",
              "desc": "Choose upper body or lower body for focused scrubbing."
            }
          ],
          "things_to_know": [
            "Helps when you only want specific areas treated.",
            "Avoid on broken or inflamed skin."
          ],
          "after_care": [
            "Apply moisturiser after the session.",
            "Avoid scrubbing again for a few days."
          ],
          "faq": []
        },
        {
          "id": "full-hand-scrub",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Full Hand Scrub",
          "subtitle": "Exfoliation focused on both hands and arms",
          "image": "",
          "bannerImage": "",
          "price": 319,
          "oldPrice": 449,
          "discountPercent": 29,
          "duration": "20–25 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 450
          },
          "overview": [
            {
              "title": "Arm Smoothening",
              "desc": "Helps reduce roughness and tanning on arms."
            }
          ],
          "things_to_know": [
            "Avoid if arms were just waxed or shaved very recently.",
            "Share any product allergies."
          ],
          "after_care": [
            "Use SPF on exposed arms.",
            "Moisturise daily."
          ],
          "faq": []
        },
        {
          "id": "full-leg-scrub",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "title": "Full Leg Scrub",
          "subtitle": "Exfoliation focused on both legs",
          "image": "",
          "bannerImage": "",
          "price": 319,
          "oldPrice": 449,
          "discountPercent": 29,
          "duration": "20–25 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 430
          },
          "overview": [
            {
              "title": "Leg Smoothening",
              "desc": "Targets rough, dull skin on legs for a softer feel."
            }
          ],
          "things_to_know": [
            "Avoid immediately after waxing.",
            "Best when combined with regular moisturising."
          ],
          "after_care": [
            "Apply body lotion after shower.",
            "Do not over-scrub at home."
          ],
          "faq": []
        },
        {
          "id": "bleach-face-neck",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Bleach"
          ],
          "title": "Bleach - Face & Neck",
          "subtitle": "Standard bleach for face and neck",
          "image": "",
          "bannerImage": "",
          "price": 249,
          "oldPrice": 349,
          "discountPercent": 29,
          "duration": "20–25 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.4,
            "count": 900
          },
          "overview": [
            {
              "title": "Tone Adjustment",
              "desc": "Lightens the appearance of facial hair and gives a brighter look to face and neck."
            }
          ],
          "things_to_know": [
            "Patch test is recommended for sensitive skin.",
            "Avoid on active acne, cuts or recent waxing areas."
          ],
          "after_care": [
            "Do not use strong actives or scrubs for 24 hours.",
            "Apply sunscreen if going out."
          ],
          "faq": []
        },
        {
          "id": "bleach-face-only",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Bleach"
          ],
          "title": "Bleach - Face",
          "subtitle": "Quick bleach for face area",
          "image": "",
          "bannerImage": "",
          "price": 159,
          "oldPrice": 220,
          "discountPercent": 28,
          "duration": "15–20 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.4,
            "count": 700
          },
          "overview": [
            {
              "title": "Soft Brightening",
              "desc": "Helps lighten facial hair tone for an overall brighter appearance."
            }
          ],
          "things_to_know": [
            "Not recommended for highly sensitive or allergy-prone skin.",
            "Avoid around eyes and lips."
          ],
          "after_care": [
            "Use calming gel or moisturiser.",
            "Avoid direct sun and harsh products for a day."
          ],
          "faq": []
        },
        {
          "id": "t10-detan-face",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "title": "T10 Detan - Face",
          "subtitle": "Detan treatment focused on face",
          "image": "",
          "bannerImage": "",
          "price": 239,
          "oldPrice": 330,
          "discountPercent": 28,
          "duration": "20–25 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.5,
            "count": 650
          },
          "overview": [
            {
              "title": "Tan Reduction",
              "desc": "Targets mild to moderate sun-tan and dullness on the face."
            }
          ],
          "things_to_know": [
            "Results depend on depth of tanning.",
            "Best combined with regular sun protection."
          ],
          "after_care": [
            "Use SPF 30+ daily.",
            "Avoid using peels or strong exfoliants immediately after."
          ],
          "faq": []
        },
        {
          "id": "3-in-1-led-night-therapy-mask",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "title": "3-in-1 LED Night Therapy Face Mask",
          "subtitle": "Add-on LED-inspired mask for glow & calm",
          "image": "",
          "bannerImage": "",
          "price": 99,
          "oldPrice": 150,
          "discountPercent": 34,
          "duration": "10–15 mins (add-on)",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.3,
            "count": 300
          },
          "overview": [
            {
              "title": "Quick Add-On",
              "desc": "Helps in soothing, hydrating and giving a mild radiance boost as an add-on step."
            }
          ],
          "things_to_know": [
            "Meant as an add-on to another service, not a full facial.",
            "Always inform if you are photosensitive or under skin treatment."
          ],
          "after_care": [
            "Continue gentle skincare at night.",
            "Avoid layering too many products on top."
          ],
          "faq": []
        },
        {
          "id": "charcoal-algae-peel-off-mask",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "title": "Charcoal Algae Peel-Off Mold Mask",
          "subtitle": "Detox-style peel-off mask for clogged skin",
          "image": "",
          "bannerImage": "",
          "price": 300,
          "oldPrice": 399,
          "discountPercent": 25,
          "duration": "20–25 mins",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.4,
            "count": 500
          },
          "overview": [
            {
              "title": "Deep-Clean Feel",
              "desc": "Charcoal + algae-based peel-off mask for a cleaner, fresher feeling skin."
            }
          ],
          "things_to_know": [
            "Not recommended for very sensitive or extremely dry skin.",
            "Should not be used on broken or irritated areas."
          ],
          "after_care": [
            "Apply a calming moisturiser after the mask.",
            "Avoid scrubbing for at least a day."
          ],
          "faq": []
        },
        {
          "id": "korean-waxing-ritual",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Korean Waxing Ritual - Full Arms + Full Legs + Underarms",
          "subtitle": "",
          "image": "",
          "bannerImage": "",
          "price": 799,
          "oldPrice": 1699,
          "discountPercent": 52,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": null,
            "count": null
          },
          "overview": [
            {
              "title": "Waxing Kit",
              "desc": "Disposable, hygienic waxing kit included."
            },
            {
              "title": "3-Step Ritual",
              "desc": "Typically includes scrub, gel wax and post-wax lotion."
            }
          ],
          "things_to_know": [
            "Hair length should be at least 0.25 inch for best results.",
            "Avoid if you have open wounds, sunburn or rashes.",
            "AC or a cool room is recommended during waxing."
          ],
          "after_care": [
            "Avoid hot showers, saunas or steam for 24 hours.",
            "Wear loose clothing to prevent friction.",
            "Apply soothing gel or moisturiser on waxed areas."
          ],
          "faq": [
            {
              "question": "Why is waxing better than shaving?",
              "answer": "Waxing removes hair from the root, resulting in smoother and longer-lasting results than shaving."
            },
            {
              "question": "How often should I get waxed?",
              "answer": "Every 3–4 weeks is ideal for most people, depending on hair growth."
            },
            {
              "question": "Does waxing cause redness?",
              "answer": "Mild redness is normal and usually settles within a few hours."
            }
          ]
        },
        {
          "id": "rica-gold-roll-on",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Rica Gold Roll On - Full Arms + Full Legs + Underarms",
          "subtitle": "",
          "image": "",
          "bannerImage": "",
          "price": 849,
          "oldPrice": 1799,
          "discountPercent": 52,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": null,
            "count": 77
          },
          "overview": [
            {
              "title": "Roll-On System",
              "desc": "Clean, quick waxing with roll-on applicators."
            }
          ],
          "things_to_know": [
            "Ensures even wax distribution and reduced spillage.",
            "Patch test is recommended for sensitive skin."
          ],
          "after_care": [
            "Avoid harsh scrubs on waxed area for a few days.",
            "Use a gentle body lotion to keep skin soft."
          ],
          "faq": [
            {
              "question": "Is roll-on wax hygienic?",
              "answer": "Yes, when used with fresh cartridges and proper technique, it is clean and efficient."
            }
          ]
        },
        {
          "id": "stripless-korean-bikini-wax",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "title": "Stripless Korean Bikini Wax",
          "subtitle": "One-time use peel-off wax for bikini area",
          "image": "",
          "bannerImage": "",
          "price": 749,
          "oldPrice": 1499,
          "discountPercent": 50,
          "duration": "",
          "bookings": "",
          "avatar":"",
          "gender": "F",
          "features": [],
          "ratings": {
            "score": 4.73,
            "count": 35377
          },
          "overview": [
            {
              "title": "Peel-Off Wax",
              "desc": "Designed especially for the sensitive bikini area using stripless peel-off wax."
            }
          ],
          "things_to_know": [
            "Suitable for bikini area only, not full body.",
            "Avoid during menstruation or if you have active infections."
          ],
          "after_care": [
            "Wear loose, cotton-based underwear post service.",
            "Avoid hot water, pools and saunas for at least 24 hours."
          ],
          "faq": [
            {
              "question": "Is bikini waxing safe?",
              "answer": "Yes, when done by a trained professional using the correct products and hygiene."
            },
            {
              "question": "How often should I get bikini waxing done?",
              "answer": "Every 4–6 weeks depending on hair growth and comfort."
            },
            {
              "question": "Can I use products immediately after?",
              "answer": "Avoid perfumed products and harsh cleansers on the area for at least 24 hours."
            }
          ]
        },
        {
          "id": "keratin-harissa-treatment",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Keratin Harissa Treatment with Serum",
          "subtitle": "Frizz control + deep nourishment",
          "price": 999,
          "oldPrice": 1899,
          "discountPercent": 47,
          "duration": "60 mins",
          "ratings": {
            "score": 4.72,
            "count": 4820
          },
          "overview": [
            {
              "title": "Smoothening",
              "desc": "Keratin-infused formula reduces frizz and adds shine."
            },
            {
              "title": "Nourishing Serum",
              "desc": "Deep serum massage boosts hair health and softness."
            }
          ],
          "benefits": [
            "Reduces frizz and improves texture",
            "Adds natural shine",
            "Strengthens hair cuticles",
            "Deep hydration for dry hair"
          ],
          "things_to_know": [
            "Suitable for all hair types",
            "Do not wash hair for 24 hours after treatment",
            "Avoid heat styling immediately after service"
          ],
          "after_care": [
            "Use sulfate-free shampoo",
            "Apply serum regularly",
            "Avoid harsh chemical treatments for a week"
          ],
          "faq": [
            {
              "question": "How long does the effect last?",
              "answer": "Typically 2–4 weeks depending on hair type."
            },
            {
              "question": "Is it safe for colored hair?",
              "answer": "Yes, keratin helps maintain color vibrancy."
            }
          ]
        },
        {
          "id": "hair-color-application",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Hair Services"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Hair Color Application",
          "subtitle": "Even coverage by professionals",
          "price": 240,
          "oldPrice": 399,
          "discountPercent": 40,
          "duration": "40 mins",
          "ratings": {
            "score": 4.68,
            "count": 3920
          },
          "overview": [
            {
              "title": "Even Coverage",
              "desc": "Uniform color application for natural finish."
            }
          ],
          "benefits": [
            "Enhances overall appearance",
            "Quick and safe application",
            "Professional color distribution"
          ],
          "things_to_know": [
            "Client must provide the color",
            "Patch test recommended 24 hrs before"
          ],
          "after_care": [
            "Avoid washing hair for 24 hrs",
            "Use color-protect shampoo"
          ],
          "faq": [
            {
              "question": "Do you provide the color?",
              "answer": "No, customer must provide their preferred color."
            }
          ]
        },
        {
          "id": "head-massage",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Other"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Head Massage",
          "subtitle": "Relaxing scalp massage",
          "price": 139,
          "oldPrice": 199,
          "discountPercent": 30,
          "duration": "20 mins",
          "ratings": {
            "score": 4.84,
            "count": 8520
          },
          "overview": [
            {
              "title": "Stress Relief",
              "desc": "Stimulates blood flow and relaxes scalp tension."
            }
          ],
          "benefits": [
            "Relieves stress & anxiety",
            "Improves scalp circulation",
            "Promotes relaxation"
          ],
          "things_to_know": [
            "Oil is optional based on your preference"
          ],
          "after_care": [
            "Keep scalp warm for enhanced relaxation"
          ],
          "faq": []
        },
        {
          "id": "henna-application",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Hair Services"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Henna Application",
          "subtitle": "Natural conditioning + shine",
          "price": 180,
          "oldPrice": 300,
          "discountPercent": 40,
          "duration": "45 mins",
          "ratings": {
            "score": 4.7,
            "count": 2410
          },
          "overview": [
            {
              "title": "Natural Conditioning",
              "desc": "Herbal henna helps nourish and strengthen hair."
            }
          ],
          "benefits": [
            "Adds shine and softness",
            "Strengthens hair roots",
            "Chemical-free natural coloring"
          ],
          "things_to_know": [
            "Customer must provide henna"
          ],
          "after_care": [
            "Do not use shampoo for 24 hrs"
          ],
          "faq": []
        },
        {
          "id": "caffeine-scalp-scrub",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Scrubs"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Caffeine Scalp Scrub",
          "subtitle": "Deep cleansing + dandruff control",
          "price": 300,
          "oldPrice": 549,
          "discountPercent": 45,
          "duration": "25 mins",
          "ratings": {
            "score": 4.76,
            "count": 3110
          },
          "overview": [
            {
              "title": "Detoxifying Scrub",
              "desc": "Removes buildup, flakes, and excess oil."
            }
          ],
          "benefits": [
            "Controls dandruff",
            "Improves scalp health",
            "Cleanses pores and stimulates growth"
          ],
          "things_to_know": [
            "Use once every 7–10 days",
            "Avoid if scalp is wounded or irritated"
          ],
          "after_care": [
            "Avoid oiling immediately after scrub"
          ],
          "faq": []
        },
        {
          "id": "eyebrow-threading",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Threading"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Eyebrow Threading",
          "subtitle": "Precise shaping & clean finish",
          "price": 30,
          "oldPrice": 60,
          "discountPercent": 50,
          "duration": "10 mins",
          "ratings": {
            "score": 4.85,
            "count": 10200
          },
          "overview": [
            {
              "title": "Defined Shape",
              "desc": "Gives natural, sharp eyebrow definition."
            }
          ],
          "benefits": [
            "Gentle on skin",
            "Longer-lasting than shaving",
            "Precise shaping"
          ],
          "things_to_know": [
            "Avoid immediately if you have active acne"
          ],
          "after_care": [
            "Apply aloe gel for soothing"
          ],
          "faq": []
        },
        {
          "id": "face-wax",
          "belongs_to": [
            "salon_for_women"
          ],
          "withFilter": [
            "Waxing"
          ],
          "bannerImage": "",
          "image": "",
          "title": "Face Wax",
          "subtitle": "Quick, smooth hair removal",
          "price": 65,
          "oldPrice": 120,
          "discountPercent": 46,
          "duration": "15 mins",
          "ratings": {
            "score": 4.78,
            "count": 5600
          },
          "overview": [
            {
              "title": "Smooth Finish",
              "desc": "Removes fine facial hair for an even glow."
            }
          ],
          "benefits": [
            "Removes fine hair",
            "Instant glow",
            "Smooth surface for makeup"
          ],
          "things_to_know": [
            "Avoid if you have active rashes or chemical peels",
            "May cause mild redness temporarily"
          ],
          "after_care": [
            "Use soothing gel",
            "Avoid makeup for 4 hours",
            "Avoid sun exposure briefly"
          ],
          "faq": []
        }
      ]
    },
    {
      id: "makeup_and_styling",
      name: "Makeup & Styling",
      filters: [
        "Party Makeup",
        "Eye Makeup",
        "Best Packages",
        "Wedding Packages",
        "Hair Styling",
        "All"
      ],
      packages: [

        /* ---------------------------------------------------------
           PARTY MAKEUP
        --------------------------------------------------------- */

        {
          id: "basic_makeup",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Party Makeup"],
          bannerImage: "",
          title: "Basic Makeup",
          subtitle: "Soft glam look using quality products",
          price: 909,   // 1319 → -30% → 923 → rounded → 909
          oldPrice: 1969,  // 1319*1.5 = 1978 → rounded → 1969
          discountPercent: 54,
          duration: "1 hr",

          overview: [
            { title: "Lightweight Base", desc: "Smooth, breathable foundation for all-day comfort." },
            { title: "Soft Contour", desc: "Defined yet natural facial structure." },
            { title: "Blush & Highlight", desc: "Dewy and youthful glow." },
            { title: "Neutral Eye Look", desc: "Perfect for day & small functions." }
          ],

          things_to_know: [
            "Artist uses skin-type appropriate primer.",
            "Products chosen to avoid cakiness and excess oil.",
            "Lashes not included (add-ons available).",
          ],
          after_care: [
            "Avoid touching or rubbing the face.",
            "Use setting spray if stepping outdoors.",
            "Blot gently instead of reapplying foundation.",
            "Remove makeup with a gentle oil-based cleanser."
          ],

          faq: [
            {
              question: "Is this suitable for oily skin?",
              answer: "Yes, mattifying products are used to control shine for up to 6 hours."
            },
            {
              question: "Does it include hairstyling?",
              answer: "No, hairstyling is optional and can be added separately."
            },
            {
              question: "Can I choose my own look?",
              answer: "Yes, our artist will customise the look based on your reference images."
            },
            {
              question: "Is lash application included?",
              answer: "Basic lashes can be added at a minimal extra charge."
            }
          ]
        },

        /* ---------------------------------------------------------
           HD FINISH MAKEUP
        --------------------------------------------------------- */

        {
          id: "hd_finish_makeup",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Party Makeup"],
          bannerImage: "",
          title: "HD Finish Makeup",
          subtitle: "High-definition, long-lasting party makeup",
          price: 1439,   // 2059 → -30% → 1441 → 1439
          oldPrice: 3089, // 2059*1.5 = 3088 → 3089
          discountPercent: 53,
          duration: "1 hr 20 min",

          overview: [
            { title: "HD Base", desc: "Camera-ready, pore-blurring finish." },
            { title: "Long Lasting", desc: "Designed to stay flawless for events & shoots." },
            { title: "Detailed Eye Work", desc: "Soft glam or bold looks as per preference." },
            { title: "Custom Skin Prep", desc: "Artist prepares skin for smooth application." }
          ],

          things_to_know: [
            "Avoid heavy moisturizer before service.",
            "A patch test for primer can be done if requested.",
            "Lashes not included by default.",
            "Ideal for evening events, receptions, gatherings.",
            "Artist requires a clean, well-lit area to work.",
            "Keep your hair tied back unless opting for hairstyling."
          ],

          after_care: [
            "Use blotting papers instead of compact powder.",
            "Keep a lip gloss handy for touchups.",
            "Avoid sweating for at least 30 minutes after service.",
            "Remove makeup gently before sleeping."
          ],

          faq: [
            {
              question: "Is HD makeup heavy?",
              answer: "No, despite high coverage, HD products are lightweight and breathable."
            },
            {
              question: "Does it work for photoshoots?",
              answer: "Yes, HD makeup is specifically designed for camera clarity."
            },
            {
              question: "Can I choose bold eye makeup?",
              answer: "Absolutely — smoky, glitter or matte eye looks can be created."
            },
            {
              question: "How long does HD makeup last?",
              answer: "Typically 6–10 hours depending on weather conditions."
            }
          ]
        },

        /* ---------------------------------------------------------
           PREMIUM MAKEUP
        --------------------------------------------------------- */

        {
          id: "premium_makeup",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Party Makeup"],
          bannerImage: "",
          title: "Premium Makeup",
          subtitle: "High-end international products & elite finish",
          price: 1749,   // 2499 → -30% → 1749 → already 9
          oldPrice: 3749, // 2499*1.5 = 3748 → 3749
          discountPercent: 53,
          duration: "1 hr 40 min",

          overview: [
            { title: "Luxury Products", desc: "Only premium global brands used." },
            { title: "Flawless Coverage", desc: "Airbrushed-like finish." },
            { title: "Advanced Eye Look", desc: "Cut-crease, glitter, smokey options." },
            { title: "Skin Prep Ritual", desc: "Deep priming and hydration routine included." }
          ],

          things_to_know: [
            "Ideal for weddings, high-profile events & shoots.",
            "Requires a table & chair with good lighting.",
            "Lash application is optional at extra charge.",
            "Please avoid facials 24 hrs before makeup.",
            "Artist will match your skin tone exactly.",
            "Please keep hair tied unless opting for styling."
          ],

          after_care: [
            "Avoid touching the face throughout the event.",
            "Carry blotting sheets for shine control.",
            "Use a straw for drinking to avoid lip smudge.",
            "Remove gently with balm/oil cleanser."
          ],

          faq: [
            {
              question: "What makes premium makeup different?",
              answer: "International high-end products ensure longer wear, smooth blending & accurate tone match."
            },
            {
              question: "Does it include a skincare prep?",
              answer: "Yes, a 4-step skin priming routine is included."
            },
            {
              question: "Can it handle sweating?",
              answer: "Yes, premium setting techniques are used."
            },
            {
              question: "Is it suitable for sensitive skin?",
              answer: "Yes, hypoallergenic products are used."
            }
          ]
        },

        /* ---------------------------------------------------------
           EYE MAKEUP SECTION
        --------------------------------------------------------- */

        {
          id: "base_eye_makeup",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Eye Makeup"],
          bannerImage: "",
          title: "Base Eye Makeup",
          subtitle: "Soft, natural enhancement",
          price: 299, // 425 → -30%
          oldPrice: 639, // 425*1.5
          discountPercent: 53,
          duration: "25 min",

          overview: [
            { title: "Soft Blending", desc: "Neutral tones for everyday elegance." },
            { title: "Light Liner", desc: "Subtle definition without harshness." }
          ],

          things_to_know: [
            "Suitable for all skin types.",
            "Best for small functions or office events.",
            "Does not include lashes.",
            "No glitter or advanced shading."
          ],

          after_care: ["Avoid rubbing eyes", "Use waterproof setting spray", "Remove gently"],

          faq: [
            { question: "Is this waterproof?", answer: "Yes, smudge-proof formula is used." }
          ]
        },

        {
          id: "advanced_eye_makeup",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Eye Makeup"],
          bannerImage: "",
          title: "Advanced Eye Makeup",
          subtitle: "Bolder, more defined eye artistry",
          price: 389,  // 558 → -30%
          oldPrice: 839, // 558*1.5
          discountPercent: 54,
          duration: "30 min",

          overview: [
            { title: "Intense Shading", desc: "Smokey, glitter or deep pigment looks." },
            { title: "Long-lasting", desc: "Perfect for evening events." }
          ],

          things_to_know: [
            "Please keep eyes free from kajal before service.",
            "Lashes can be added separately.",
            "Artist requires good lighting."
          ],

          after_care: ["Avoid water for 30 minutes", "Do not rub eyes"],

          faq: [
            { question: "Can I bring reference pictures?", answer: "Yes, artist will match the style." }
          ]
        },

        /* ---------------------------------------------------------
           BEST PACKAGES
        --------------------------------------------------------- */

        {
          id: "basic_makeup_combo",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Best Packages"],
          bannerImage: "",
          title: "Basic Makeup Combo",
          subtitle: "Budget-friendly duo package",
          price: 1209, // 1729 → -30%
          oldPrice: 2599,
          discountPercent: 53,
          duration: "1 hr 30 min",

          overview: [
            { title: "Full Party Makeup", desc: "Natural soft glam." },
            { title: "Simple Hairstyling", desc: "Straightening or curls." }
          ],

          things_to_know: [
            "Ideal for birthdays, dinners, small functions.",
            "Hair wash not included."
          ],

          after_care: ["Avoid humidity", "Use setting spray"],

          faq: []
        },

        {
          id: "hd_makeup_combo",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Best Packages"],
          bannerImage: "",
          title: "HD Makeup Combo",
          subtitle: "High-definition finish with styling",
          price: 1679, // 2399 → -30%
          oldPrice: 3599,
          discountPercent: 53,
          duration: "1 hr 40 min",

          overview: [
            { title: "HD Base", desc: "Camera-ready finish." },
            { title: "Detailed Eye Work", desc: "Soft or bold looks." }
          ],

          things_to_know: ["Ideal for shoots"],

          after_care: ["Avoid touching face"],

          faq: []
        },

        {
          id: "premium_makeup_combo",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Best Packages"],
          bannerImage: "",
          title: "Premium Makeup Combo",
          subtitle: "Elite makeup + hairstyle package",
          price: 2159, // 3079 → -30%
          oldPrice: 4619,
          discountPercent: 53,
          duration: "2 hr 20 min",

          overview: [
            { title: "Premium Products", desc: "Luxury brands only." }
          ],

          things_to_know: [],
          after_care: [],
          faq: []
        },

        /* ---------------------------------------------------------
           WEDDING PACKAGES
        --------------------------------------------------------- */

        {
          id: "wedding_basic_3",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Wedding Packages"],
          bannerImage: "",
          title: "Basic Makeup Combo - 3 Persons",
          subtitle: "Perfect for small family events",
          price: 3219,
          oldPrice: 6881,
          discountPercent: 53,
          duration: "4 hr 10 min",

          overview: [
            { title: "3 Full Makeovers", desc: "Soft glam party looks." }
          ],
          things_to_know: [],
          after_care: [],
          faq: []
        },

        {
          id: "wedding_basic_7",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Wedding Packages"],
          bannerImage: "",
          title: "Basic Makeup Combo - 7 Persons",
          subtitle: "Ideal for wedding day family prep",
          price: 6659,
          oldPrice: 14271,
          discountPercent: 53,
          duration: "8 hr 45 min",

          overview: [
            { title: "7 Full Makeovers", desc: "Customised for all ages." }
          ],
          things_to_know: [],
          after_care: [],
          faq: []
        },

        {
          id: "wedding_basic_5",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Wedding Packages"],
          bannerImage: "",
          title: "Basic Makeup Combo - 5 Persons",
          subtitle: "Perfect for mid-sized functions",
          price: 5049,
          oldPrice: 10831,
          discountPercent: 53,
          duration: "6 hr 15 min",

          overview: [
            { title: "5 Makeovers", desc: "Balanced glam for events." }
          ],
          things_to_know: [],
          after_care: [],
          faq: []
        },

        /* ---------------------------------------------------------
           HAIR STYLING
        --------------------------------------------------------- */

        {
          id: "basic_styling",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Hair Styling"],
          bannerImage: "",
          title: "Basic Hair Styling",
          subtitle: "Simple curls, straightening or light styling",
          price: 429, // 614 → -30%
          oldPrice: 919,
          discountPercent: 53,
          duration: "45 min",

          overview: [
            { title: "Quick Styling", desc: "Perfect for casual events." }
          ],

          things_to_know: [
            "Hair wash not included.",
            "Proper combing required before session."
          ],

          after_care: [
            "Avoid humidity",
            "Do not comb tightly"
          ],

          faq: []
        },

        {
          id: "advanced_styling",
          belongs_to: ["makeup_and_styling"],
          withFilter: ["Hair Styling"],
          bannerImage: "",
          title: "Advanced Hair Styling",
          subtitle: "Braids, textured looks, curls, party styling",
          price: 549, // 784 → -30%
          oldPrice: 1179,
          discountPercent: 53,
          duration: "55 min",

          overview: [
            { title: "Advanced Techniques", desc: "Volume, texture and long-hold looks." }
          ],

          things_to_know: [],
          after_care: [],
          faq: []
        },

      ]
    },
    {
      id: "hairstyling",
      name: "Hair Cut & Style",
      filters: ["All", "Haircut Services", "Hair Care Services", "Creative Hair Services"],
      packages: [

        /* ---------------------
           HAIRCUT SERVICES
        ---------------------- */

        {
          id: "haircut_blowdry",
          belongs_to: ["hairstyling"],
          withFilter: ["Haircut Services"],
          bannerImage: "",
          image: "",
          title: "Haircut + Blow Dry",
          subtitle: "Professional haircut with smooth finishing blow-dry",

          price: 249,
          oldPrice: 540,
          discountPercent: 54,

          duration: "45 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.7, count: 0 },

          overview: [
            { title: "Customized Cut", desc: "Suitable for your face shape & hair texture." },
            { title: "Blow Dry Finish", desc: "Smooth salon-style finishing blow dry." }
          ],

          things_to_know: [
            "Hair wash is not included.",
            "Stylist will guide you with best cut options.",
            "Keep hair tangle-free before service starts."
          ],

          after_care: [
            "Avoid tying your hair tightly for a few hours.",
            "Use sulfate-free shampoo for long-term hair health."
          ],

          faq: [
            {
              question: "Is blow dry included?",
              answer: "Yes, a complete finishing blow dry is included."
            }
          ]
        },

        {
          id: "keratin_hair_spa_serum",
          belongs_to: ["hairstyling"],
          withFilter: ["Haircut Services"],
          bannerImage: "",
          image: "",

          title: "Keratin Hair Spa Treatment with Serum",
          subtitle: "Deep repair keratin spa with nourishing serum",

          price: 779,
          oldPrice: 1679,
          discountPercent: 54,

          duration: "1 hr",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.8, count: 0 },

          overview: [
            { title: "Keratin Repair", desc: "Detangles, smoothens & reduces frizz." },
            { title: "Serum Finish", desc: "Nourishing serum locks in moisture." }
          ],

          things_to_know: [
            "Avoid hair wash for 24 hours.",
            "Steam is not included.",
            "Not recommended for extremely damaged hair."
          ],

          after_care: [
            "Use keratin-safe shampoo.",
            "Avoid tying hair tightly for 4–5 hours."
          ],

          faq: []
        },

        /* ---------------------
           HAIR CARE SERVICES
        ---------------------- */

        {
          id: "henna_application",
          belongs_to: ["hairstyling"],
          withFilter: ["Hair Care Services"],
          bannerImage: "",
          image: "",

          title: "Henna Application",
          subtitle: "Natural henna coating for shine & cooling effect",

          price: 159,
          oldPrice: 360,
          discountPercent: 56,

          duration: "20 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.6, count: 0 },

          overview: [
            { title: "Natural Shine", desc: "Enhances texture & softness." }
          ],

          things_to_know: [
            "Color intensity varies based on natural hair tone.",
            "If using your henna, ensure the expiry date is valid."
          ],

          after_care: [
            "Rinse with plain water first.",
            "Avoid shampoo for 24 hours."
          ],

          faq: []
        },

        {
          id: "head_neck_shoulder_massage",
          belongs_to: ["hairstyling"],
          withFilter: ["Hair Care Services"],
          bannerImage: "",
          image: "",

          title: "Head, Neck & Shoulder Massage",
          subtitle: "Relaxing pressure therapy for stress relief",

          price: 229,
          oldPrice: 494,
          discountPercent: 54,

          duration: "35 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.9, count: 0 },

          overview: [
            { title: "Relaxation Therapy", desc: "Eases upper body tension & stress." }
          ],

          things_to_know: [
            "Avoid if you have severe migraines.",
            "Oil used: coconut or merchant's choice."
          ],

          after_care: [
            "Drink water after massage.",
            "Avoid hair wash immediately."
          ],

          faq: []
        },

        {
          id: "touchup_own_product",
          belongs_to: ["hairstyling"],
          withFilter: ["Hair Care Services"],
          bannerImage: "",
          image: "",

          title: "Touch-up Using Your Own Product",
          subtitle: "Roots & hairline touch-up using your product only",

          price: 219,
          oldPrice: 480,
          discountPercent: 54,

          duration: "40 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.5, count: 0 },

          overview: [
            { title: "Custom Application", desc: "Perfect for roots and grey coverage." }
          ],

          things_to_know: [
            "We don't take responsibility for product reactions.",
            "Product must be in original sealed packaging."
          ],

          after_care: [
            "Do not wash hair for 24 hours.",
            "Use conditioner to avoid dryness."
          ],

          faq: []
        },

        {
          id: "head_oil_massage",
          belongs_to: ["hairstyling"],
          withFilter: ["Hair Care Services"],
          bannerImage: "",
          image: "",

          title: "Head Oil Massage",
          subtitle: "Warm oil therapeutic scalp relaxation",

          price: 199,
          oldPrice: 434,
          discountPercent: 54,

          duration: "30 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.8, count: 0 },

          overview: [
            { title: "Warm Oil Therapy", desc: "Improves circulation & reduces tension." }
          ],

          things_to_know: [
            "Avoid if you have severe dandruff or scalp wounds."
          ],

          after_care: [
            "Keep oil for at least 1 hour.",
            "Use mild shampoo later."
          ],

          faq: []
        },

        {
          id: "full_hair_color",
          belongs_to: ["hairstyling"],
          withFilter: ["Hair Care Services"],
          bannerImage: "",
          image: "",

          title: "Full Hair Color Application",
          subtitle: "Full-length even hair color application",

          price: 329,
          oldPrice: 720,
          discountPercent: 54,

          duration: "1 hr",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.5, count: 0 },

          overview: [
            { title: "Complete Coverage", desc: "Even coloring from roots to tips." }
          ],

          things_to_know: [
            "Bleach is not included.",
            "Patch test recommended."
          ],

          after_care: [
            "Use color-safe shampoo.",
            "Avoid harsh sunlight for 24 hours."
          ],

          faq: []
        },

        /* ---------------------
           CREATIVE SERVICES
        ---------------------- */

        {
          id: "temporary_hair_straightening",
          belongs_to: ["hairstyling"],
          withFilter: ["Creative Hair Services"],
          bannerImage: "",
          image: "",

          title: "Temporary Hair Straightening",
          subtitle: "Smooth heat-styled temporary straight look",

          price: 279,
          oldPrice: 600,
          discountPercent: 54,

          duration: "50 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.7, count: 0 },

          overview: [
            { title: "Instant Sleek Look", desc: "Ideal for parties & events." }
          ],

          things_to_know: [
            "Heat protection serum applied before styling.",
            "This is not permanent straightening."
          ],

          after_care: [
            "Avoid washing hair for 3 hours.",
            "Use heat-protection spray."
          ],

          faq: []
        },

        {
          id: "hair_curls_waves",
          belongs_to: ["hairstyling"],
          withFilter: ["Creative Hair Services"],
          bannerImage: "",
          image: "",

          title: "Hair Curls & Waves",
          subtitle: "Soft curl styling or glam waves",

          price: 279,
          oldPrice: 600,
          discountPercent: 54,

          duration: "50 min",
          bookings: "",
          avatars: [],
          features: [],
          ratings: { score: 4.8, count: 0 },

          overview: [
            { title: "Soft Curls", desc: "Loose waves or defined curls as you prefer." }
          ],

          things_to_know: [
            "Heat styling included.",
            "Not suitable for very short hair."
          ],

          after_care: [
            "Avoid brushing after styling.",
            "Use hairspray for hold."
          ],

          faq: []
        }
      ]
    }
  ]
};
