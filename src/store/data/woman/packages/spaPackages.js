export const spaPackages = [
    {
        "id": "full-body-swedish-massage",
        "belongs_to": ["spa_for_women"],
        "withFilter": ["Spa Bestseller"],
        "title": "Full Body Swedish Massage",
        "subtitle": "Relaxation-focused body massage",
        "image": "",
        "miniAvatar": "",
        "startsFrom": 970,
        "hasTiers": true,
        "tiers": [
            {
                "id": "swedish-1-session",
                "label": "1 Session",
                "price": 970,
                "oldPrice": 1499,
                "discount": 35,
                "duration": "60 minutes"
            },
            {
                "id": "swedish-2-session-1month",
                "label": "2 Sessions over 1 Month",
                "price": 1746,
                "oldPrice": 2998,
                "discount": 42,
                "duration": "2 × 60 minutes"
            },
            {
                "id": "swedish-4-session-2month",
                "label": "4 Sessions over 2 Months",
                "price": 3396,
                "oldPrice": 5996,
                "discount": 43,
                "duration": "4 × 60 minutes"
            },
            {
                "id": "swedish-6-session-3month",
                "label": "6 Sessions over 3 Months",
                "price": 4794,
                "oldPrice": 8994,
                "discount": 46,
                "duration": "6 × 60 minutes"
            }
        ],
        "gender": "F",
        "ratings": {
            "score": 4.82,
            "count": 1286
        },
        "overview": [
            { "title": "Massage Type", "desc": "Full Body Swedish therapeutic relaxation" },
            { "title": "Focus Areas", "desc": "Back, shoulders, legs, arms, neck and feet" },
            { "title": "Pressure Level", "desc": "Medium pressure for stress relief" }
        ],
        "things_to_know": [
            "Avoid heavy meals 1 hour before massage.",
            "Please inform the therapist about any muscle injuries.",
            "Oil used is skin-safe & hypoallergenic.",
            "Room should be comfortably warm for best results."
        ],
        "after_care": [
            "Drink water after the session to flush toxins.",
            "Avoid intense physical activity for 1–2 hours.",
            "Let the oil stay on skin for at least 30 minutes."
        ],
        "faq": [
            {
                "question": "Is Swedish massage good for beginners?",
                "answer": "Yes, it is ideal for first-time massage clients due to its gentle strokes."
            },
            {
                "question": "Does it help with body pain?",
                "answer": "Yes, it reduces muscle stiffness and improves blood flow."
            },
            {
                "question": "Is oil mandatory?",
                "answer": "Yes, Swedish massage is performed using warm massage oil for smooth gliding strokes."
            }
        ],
        "bannerImage": ""
    },
    {
        id: "full-body-swedish-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Spa Bestseller"],
        title: "Full Body Swedish Massage",
        subtitle: "Relaxing stress-relief therapy",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 970,
        hasTiers: true,
        tiers: [
            {
                id: "full-body-swedish-1session",
                label: "1 Session",
                price: 970,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "full-body-swedish-2session",
                label: "2 Sessions over 1 Month",
                price: 1746,
                oldPrice: 1940,
                discount: 10,
                duration: "60 minutes each"
            },
            {
                id: "full-body-swedish-4session",
                label: "4 Sessions over 2 Months",
                price: 3396,
                oldPrice: 3880,
                discount: 12,
                duration: "60 minutes each"
            },
            {
                id: "full-body-swedish-6session",
                label: "6 Sessions over 3 Months",
                price: 4794,
                oldPrice: 5820,
                discount: 18,
                duration: "60 minutes each"
            }
        ]
    },

    /* --------------------------------------------------------
       DEEP TISSUE MASSAGE
    -------------------------------------------------------- */
    {
        id: "deep-tissue-therapy",
        belongs_to: ["spa_for_women"],
        withFilter: ["Spa Bestseller"],
        title: "Deep Tissue Healing Therapy",
        subtitle: "Intense pain-relief massage",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 1090,
        hasTiers: true,
        tiers: [
            {
                id: "deep-tissue-1session",
                label: "1 Session",
                price: 1090,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "deep-tissue-2session",
                label: "2 Sessions over 1 Month",
                price: 1980,
                oldPrice: 2180,
                discount: 9,
                duration: "60 minutes each"
            },
            {
                id: "deep-tissue-4session",
                label: "4 Sessions over 2 Months",
                price: 3796,
                oldPrice: 4360,
                discount: 13,
                duration: "60 minutes each"
            },
            {
                id: "deep-tissue-6session",
                label: "6 Sessions over 3 Months",
                price: 5496,
                oldPrice: 6540,
                discount: 16,
                duration: "60 minutes each"
            }
        ]
    },

    /* --------------------------------------------------------
       HEAD TO TOE PAIN RELIEF MASSAGE
    -------------------------------------------------------- */
    {
        id: "head-to-toe-pain-relief",
        belongs_to: ["spa_for_women"],
        withFilter: ["Spa Bestseller"],
        title: "Head to Toe Pain Relief",
        subtitle: "Complete muscle relaxation",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 1379,
        hasTiers: true,
        tiers: [
            {
                id: "pain-relief-1session",
                label: "1 Session",
                price: 1379,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "pain-relief-2session",
                label: "2 Sessions over 2 Months",
                price: 2498,
                oldPrice: 2758,
                discount: 9,
                duration: "60 minutes each"
            },
            {
                id: "pain-relief-4session",
                label: "4 Sessions over 2 Months",
                price: 4796,
                oldPrice: 5516,
                discount: 13,
                duration: "60 minutes each"
            },
            {
                id: "pain-relief-6session",
                label: "6 Sessions over 3 Months",
                price: 6996,
                oldPrice: 8274,
                discount: 15,
                duration: "60 minutes each"
            }
        ]
    },

    /* --------------------------------------------------------
       BALINESE KNEES MASSAGE
    -------------------------------------------------------- */
    {
        id: "balinese-knees-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Spa Bestseller"],
        title: "Balinese Knees Massage with Stretching",
        subtitle: "Targeted joint relaxation",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 1150,
        hasTiers: true,
        tiers: [
            {
                id: "balinese-1session",
                label: "1 Session",
                price: 1150,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "balinese-2session",
                label: "2 Sessions over 1 Month",
                price: 2098,
                oldPrice: 2300,
                discount: 9,
                duration: "60 minutes each"
            },
            {
                id: "balinese-4session",
                label: "4 Sessions over 2 Months",
                price: 3996,
                oldPrice: 4600,
                discount: 13,
                duration: "60 minutes each"
            },
            {
                id: "balinese-6session",
                label: "6 Sessions over 3 Months",
                price: 5694,
                oldPrice: 6900,
                discount: 17,
                duration: "60 minutes each"
            }
        ]
    },

    /* --------------------------------------------------------
       JET LAG RELIEF MASSAGE
    -------------------------------------------------------- */
    {
        id: "jet-lag-relief",
        belongs_to: ["spa_for_women"],
        withFilter: ["Spa Bestseller"],
        title: "Jet Lag Relief Massage",
        subtitle: "Rebalance & energise the body",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 970,
        hasTiers: true,
        tiers: [
            {
                id: "jetlag-1session",
                label: "1 Session",
                price: 970,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "jetlag-2session",
                label: "2 Sessions over 1 Month",
                price: 1746,
                oldPrice: 1940,
                discount: 9,
                duration: "60 minutes each"
            },
            {
                id: "jetlag-4session",
                label: "4 Sessions over 2 Months",
                price: 3396,
                oldPrice: 3880,
                discount: 12,
                duration: "60 minutes each"
            },
            {
                id: "jetlag-6session",
                label: "6 Sessions over 3 Months",
                price: 4794,
                oldPrice: 5820,
                discount: 18,
                duration: "60 minutes each"
            }
        ]
    },

    /* --------------------------------------------------------
       CATEGORY: STRESS RELIEF
    -------------------------------------------------------- */
    {
        id: "swedish-stress-relief",
        belongs_to: ["spa_for_women"],
        withFilter: ["Stress Relief"],
        title: "Swedish Stress Relief Massage",
        subtitle: "Relaxation for mind and body",
        image: "/images/spa_placeholder.jpg",
        startsFrom: 1330,
        hasTiers: true,
        tiers: [
            {
                id: "stress-1session",
                label: "1 Session",
                price: 1330,
                oldPrice: 0,
                discount: 0,
                duration: "60 minutes"
            },
            {
                id: "stress-2session",
                label: "2 Sessions over 1 Month",
                price: 2398,
                oldPrice: 2660,
                discount: 10,
                duration: "60 minutes each"
            },
            {
                id: "stress-4session",
                label: "4 Sessions over 2 Months",
                price: 4596,
                oldPrice: 5320,
                discount: 13,
                duration: "60 minutes each"
            },
            {
                id: "stress-6session",
                label: "6 Sessions over 3 Months",
                price: 6596,
                oldPrice: 7980,
                discount: 17,
                duration: "60 minutes each"
            }
        ]
    },

    {
        id: "aromatherapy",
        belongs_to: ["spa_for_women"],
        withFilter: ["Stress Relief"],
        title: "Aromatherapy Massage",
        subtitle: "Essential oils for deep calm",
        image: "/images/spa_placeholder.jpg",
        hasTiers: false,
        price: 970,
        duration: "60 minutes"
    },

    {
        id: "foot-reflexology",
        belongs_to: ["spa_for_women"],
        withFilter: ["Stress Relief"],
        title: "Foot Reflexology",
        subtitle: "Pressure-point relaxation",
        image: "/images/spa_placeholder.jpg",
        price: 730,
        duration: "30 minutes"
    },

    {
        id: "head-neck-shoulder",
        belongs_to: ["spa_for_women"],
        withFilter: ["Stress Relief"],
        title: "Head, Neck & Shoulder Massage",
        image: "/images/spa_placeholder.jpg",
        price: 655,
        duration: "25 minutes"
    },

    /* --------------------------------------------------------
       CATEGORY: PAIN RELIEF
    -------------------------------------------------------- */
    {
        id: "sports-therapy",
        belongs_to: ["spa_for_women"],
        withFilter: ["Pain Relief"],
        title: "Sports Therapy",
        subtitle: "Deep recovery for active women",
        image: "/images/spa_placeholder.jpg",
        price: 1090,
        duration: "60 minutes"
    },

    {
        id: "thigh-drying-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Pain Relief"],
        title: "Thigh Drying Massage",
        image: "/images/spa_placeholder.jpg",
        price: 870,
        duration: "40 minutes"
    },

    {
        id: "full-back-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Pain Relief"],
        title: "Full Back Massage",
        price: 730,
        duration: "30 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    {
        id: "full-legs-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Pain Relief"],
        title: "Full Legs Massage",
        price: 730,
        duration: "30 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    /* --------------------------------------------------------
       CATEGORY: BODY RITUAL (Scrubs)
    -------------------------------------------------------- */
    {
        id: "full-body-polishing",
        belongs_to: ["spa_for_women"],
        withFilter: ["Body Ritual"],
        title: "Full Body Polishing Spa",
        image: "/images/spa_placeholder.jpg",
        price: 2189,
        duration: "60 minutes"
    },

    {
        id: "korean-full-body-scrub",
        belongs_to: ["spa_for_women"],
        withFilter: ["Body Ritual"],
        title: "Korean Full Body Scrub",
        price: 889,
        duration: "45 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    {
        id: "face-neck-detan",
        belongs_to: ["spa_for_women"],
        withFilter: ["Skin Care & Scrubs"],
        title: "Face & Neck Detan",
        price: 419,
        duration: "25 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    {
        id: "full-back-scrub",
        belongs_to: ["spa_for_women"],
        withFilter: ["Skin Care & Scrubs"],
        title: "Full Back Scrub",
        price: 379,
        duration: "15 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    {
        id: "full-arm-scrub",
        belongs_to: ["spa_for_women"],
        withFilter: ["Skin Care & Scrubs"],
        title: "Full Arm Scrub",
        price: 379,
        duration: "15 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    {
        id: "full-leg-scrub",
        belongs_to: ["spa_for_women"],
        withFilter: ["Skin Care & Scrubs"],
        title: "Full Leg Scrub",
        price: 379,
        duration: "15 minutes",
        image: "/images/spa_placeholder.jpg"
    },

    /* --------------------------------------------------------
       POST-NATAL MASSAGE
    -------------------------------------------------------- */
    {
        id: "post-natal-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Post-Natal Massage"],
        title: "Post-Natal Massage",
        image: "/images/spa_placeholder.jpg",
        price: 970,
        duration: "60 minutes"
    },

    {
        id: "period-pamper-massage",
        belongs_to: ["spa_for_women"],
        withFilter: ["Post-Natal Massage"],
        title: "Period Pamper Massage",
        image: "/images/spa_placeholder.jpg",
        price: 790,
        duration: "45 minutes"
    },
    {
        id: "head-massage-addon",
        title: "Head Massage",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 169,
        duration: "10 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "kid-massage-addon",
        title: "Kid Massage",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 610,
        duration: "30 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "hot-pet-sheet",
        title: "Hot Pet Sheet",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 25,
        duration: "",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "head-scalp-massager",
        title: "Head & Scalp Massager",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 120,
        duration: "10 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "face-massage-addon",
        title: "Face Massage",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 306,
        duration: "",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "full-body-massager-addon",
        title: "Full Body Massager",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 240,
        duration: "20 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "full-body-stretching-addon",
        title: "Full Body Stretching",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 240,
        duration: "20 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "bamboo-massage-addon",
        title: "Bamboo Massage",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 240,
        duration: "20 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "potli-massage-addon",
        title: "Potli Massage",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 566,
        duration: "15 min",
        withFilter: ["Add-Ons"],
        belongs_to: ["spa_for_women"]
      },

      // -----------------------------
      // ⭐ TOP-UP SERVICES
      // -----------------------------
      {
        id: "topup-20min",
        title: "Top-Up (20 min)",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 240,
        duration: "20 min",
        withFilter: ["Top-Up"],
        belongs_to: ["spa_for_women"]
      },

      {
        id: "topup-30min",
        title: "Top-Up (30 min)",
        miniAvatar: "/images/spa_placeholder.jpg",
        price: 360,
        duration: "30 min",
        withFilter: ["Top-Up"],
        belongs_to: ["spa_for_women"]
      }


]
