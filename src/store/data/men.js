import swMessage from "../../asset/men/neck-shoulder.png"
import headNeck from "../../asset/men/neck-shoulder.png"
import aroma from "../../asset/men/aroma.png"
import thai from "../../asset/men/thai.png"
import bamboo from "../../asset/men/massage-men.png"

export const men = {
    categories: [
        // =============================
        // 1) STRESS RELIEF
        // =============================
        {
            id: "stress_relief",
            name: "Stress Relief",
            filters: ["All"],
            packages: [
                {
                    id: "swedish-stress-relief-massage",
                    belongs_to: ["stress_relief"],
                    withFilter: [],

                    title: "Swedish Stress Relief Massage",
                    subtitle: "Light-to-medium pressure full-body relaxation massage",
                    image: "/Users/ritik/Desktop/cl1/Nivas Beauty Enhancement-web/src/asset/men/neck-shoulder.png",

                    price: 999,
                    oldPrice: 1799,
                    discountPercent: 44,

                    duration: "60 mins",
                    bookings: "",
                    avatar: swMessage,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.77, count: 2147 },

                    overview: [
                        {
                            title: "Relaxation Therapy",
                            desc: "Gentle massage using long strokes to release mental and muscular tension."
                        },
                        {
                            title: "Improves Circulation",
                            desc: "Boosts blood flow and reduces overall fatigue."
                        },
                        {
                            title: "Deep Calm",
                            desc: "Promotes better sleep and stress reduction."
                        }
                    ],

                    things_to_know: [
                        "Suitable for people new to massage.",
                        "Avoid heavy meals 1 hour before the service.",
                        "May cause light soreness for 12–24 hrs.",
                        "Not recommended if you have injuries or swelling."
                    ],

                    after_care: [
                        "Drink plenty of water to flush toxins.",
                        "Avoid heavy workouts for the rest of the day.",
                        "Take a warm shower after 2 hours for best relaxation."
                    ],

                    faq: [
                        {
                            question: "Is Swedish massage painful?",
                            answer: "No. It uses light to medium pressure designed to relax, not cause discomfort."
                        },
                        {
                            question: "Can it help with sleep?",
                            answer: "Yes, it calms the nervous system and promotes deeper sleep."
                        },
                        {
                            question: "How often should I get this massage?",
                            answer: "Once every 2–3 weeks is ideal for stress relief."
                        }
                    ]
                },

                {
                    id: "head-neck-shoulder-relief",
                    belongs_to: ["stress_relief"],
                    withFilter: [],

                    title: "Head, Neck & Shoulder Massage",
                    subtitle: "Instant tension relief for upper body",
                    image: "https://source.unsplash.com/400x400/?headmassage,spa",
                    price: 499,
                    oldPrice: 899,
                    discountPercent: 45,

                    duration: "20 mins",
                    bookings: "",
                    avatar:headNeck,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.73, count: 2895 },

                    overview: [
                        { title: "Quick Relief", desc: "Targets stress points around the shoulders and neck." },
                        { title: "Head Relaxation", desc: "Reduces heaviness and mental fatigue." }
                    ],

                    things_to_know: [
                        "Ideal during work-from-home fatigue.",
                        "Avoid if you have migraine flare-ups.",
                        "Light oil is used unless requested otherwise."
                    ],

                    after_care: [
                        "Rest for 15 minutes post service.",
                        "Avoid screens immediately after.",
                        "Stay hydrated."
                    ],

                    faq: [
                        {
                            question: "Will it reduce headaches?",
                            answer: "Yes, it helps relieve tension headaches caused by stiffness."
                        },
                        {
                            question: "Is it safe daily?",
                            answer: "A short 10–15 min version can be done daily."
                        }
                    ]
                },

                {
                    id: "foot-reflexology",
                    belongs_to: ["stress_relief"],
                    withFilter: [],

                    title: "Foot Reflexology",
                    subtitle: "Pressure-based foot therapy for deep relaxation",
                    image: "https://source.unsplash.com/400x400/?footmassage,reflexology",

                    price: 599,
                    oldPrice: 1199,
                    discountPercent: 50,

                    duration: "30 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.80, count: 3912 },

                    overview: [
                        { title: "Reflex Pressure", desc: "Stimulates reflex points to relax the whole body." },
                        { title: "Boosts Energy", desc: "Helps reduce fatigue and enhances circulation." }
                    ],

                    things_to_know: [
                        "Avoid if you have foot wounds.",
                        "Mild soreness at pressure points is normal.",
                        "Oil or cream is used unless opted out."
                    ],

                    after_care: [
                        "Walk lightly for 10 minutes.",
                        "Drink warm water.",
                        "Avoid immediate intense activity."
                    ],

                    faq: [
                        {
                            question: "Is reflexology painful?",
                            answer: "Pressure may feel intense but should not be painful."
                        },
                        {
                            question: "Does it help with sleep?",
                            answer: "Yes, it promotes deep relaxation."
                        }
                    ]
                },

                {
                    id: "aroma-therapy",
                    belongs_to: ["stress_relief"],
                    withFilter: [],

                    title: "Aroma Therapy",
                    subtitle: "Essential oil–infused relaxation massage",
                    image: "https://source.unsplash.com/400x400/?aromatherapy,spa",

                    price: 1299,
                    oldPrice: 2199,
                    discountPercent: 41,

                    duration: "60 mins",
                    bookings: "",
                    avatar:aroma,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.81, count: 1758 },

                    overview: [
                        { title: "Aromatherapy Oils", desc: "Uses lavender, eucalyptus or lemongrass oils." },
                        { title: "Mind & Body Calm", desc: "Great for anxiety, stress and emotional balance." }
                    ],

                    things_to_know: [
                        "Patch test done if you have sensitive skin.",
                        "Strong aromas can be avoided upon request.",
                        "Avoid if allergic to essential oils."
                    ],

                    after_care: [
                        "Do not wash off oils immediately.",
                        "Avoid deodorants for 2 hours.",
                        "Drink lots of water."
                    ],

                    faq: [
                        {
                            question: "Is aroma therapy suitable for sensitive skin?",
                            answer: "Yes, mild oils are used unless you mention allergies."
                        },
                        {
                            question: "Does it help anxiety?",
                            answer: "Absolutely. Essential oils promote deep nervous system relaxation."
                        }
                    ]
                }
            ]
        },

        // =============================
        // 2) PAIN RELIEF
        // =============================
        {
            id: "pain_relief",
            name: "Pain Relief",
            filters: ["All"],
            packages: [
                {
                    id: "thai-dry-massage",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Thai Dry Massage",
                    subtitle: "Stretch-based therapy for stiffness & posture",
                    image: "https://source.unsplash.com/400x400/?thai,massage",

                    price: 1299,
                    oldPrice: 2499,
                    discountPercent: 48,

                    duration: "60 mins",
                    bookings: "",
                    avatar:thai,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.67, count: 3129 },

                    overview: [
                        { title: "No-Oil Stretching", desc: "Deep stretches release stiffness and improve flexibility." },
                        { title: "Muscle Activation", desc: "Targets major muscle groups." }
                    ],

                    things_to_know: [
                        "Intense therapy, not suitable for beginners.",
                        "Avoid if you have back injuries.",
                        "Deep stretching involved."
                    ],

                    after_care: [
                        "Rest for 30 mins.",
                        "Do not lift heavy weights immediately.",
                        "Drink water to reduce soreness."
                    ],

                    faq: [
                        {
                            question: "Is Thai massage painful?",
                            answer: "It can feel intense due to stretching but should not hurt."
                        },
                        {
                            question: "Is oil used?",
                            answer: "No, it's a fully dry stretching therapy."
                        }
                    ]
                },

                {
                    id: "bamboo-massage",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Bamboo Massage Therapy",
                    subtitle: "Heated bamboo tools for deep tissue relief",
                    image: "https://source.unsplash.com/400x400/?bamboo,massage",

                    price: 1499,
                    oldPrice: 2799,
                    discountPercent: 46,

                    duration: "60 mins",
                    bookings: "",
                    avatar:bamboo,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.79, count: 1983 },

                    overview: [
                        { title: "Thermal Relief", desc: "Warm bamboo improves blood flow." },
                        { title: "Deep Pressure", desc: "Ideal for chronic pain & knots." }
                    ],

                    things_to_know: [
                        "Not suitable for very sensitive skin.",
                        "Heat level can be adjusted.",
                        "Avoid during fever or inflammation."
                    ],

                    after_care: [
                        "Apply an ice pack if soreness occurs.",
                        "Avoid hot showers for 2 hours.",
                        "Stay hydrated."
                    ],

                    faq: [
                        {
                            question: "Is bamboo massage safe?",
                            answer: "Yes, therapists control temperature and pressure."
                        },
                        {
                            question: "Does it remove knots?",
                            answer: "Yes, excellent for deep trigger point relief."
                        }
                    ]
                },

                {
                    id: "back-massage",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Back Massage",
                    subtitle: "Focused relief for upper & lower back pain",
                    image: "https://source.unsplash.com/400x400/?back,massage",

                    price: 699,
                    oldPrice: 1299,
                    discountPercent: 46,

                    duration: "25 mins",
                    bookings: "",
                    avatar:bamboo,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.74, count: 4412 },

                    overview: [
                        { title: "Trigger Point Release", desc: "Targets back stiffness and knots." }
                    ],

                    things_to_know: [
                        "Avoid right after heavy workouts.",
                        "Pressure is adjustable.",
                        "Therapist avoids spine pressure."
                    ],

                    after_care: [
                        "Take a warm shower later.",
                        "Stretch lightly after 1 hour.",
                        "Increase water intake."
                    ],

                    faq: [
                        {
                            question: "Is back massage safe for slip-disc?",
                            answer: "No, consult a doctor first."
                        }
                    ]
                },

                {
                    id: "potli-massage",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Potli Massage",
                    subtitle: "Warm herbal potli therapy for muscle pain",
                    image: "https://source.unsplash.com/400x400/?herbal,massage",

                    price: 1299,
                    oldPrice: 2299,
                    discountPercent: 43,

                    duration: "45 mins",
                    bookings: "",
                    avatar:thai,
                    gender: "M",
                    features: [],

                    ratings: { score: 4.71, count: 1877 },

                    overview: [
                        { title: "Herbal Compress", desc: "Warm herbal pouches relax deep muscles." }
                    ],

                    things_to_know: [
                        "Heat applied in intervals.",
                        "Not suitable for broken skin or swelling.",
                        "Herbs may have a mild aroma."
                    ],

                    after_care: [
                        "Avoid cold exposure for 2 hours.",
                        "Rest after massage.",
                        "Keep the body warm."
                    ],

                    faq: [
                        {
                            question: "Does potli help muscle pain?",
                            answer: "Yes, heat and herbs reduce stiffness effectively."
                        }
                    ]
                },

                {
                    id: "leg-massage",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Legs Massage",
                    subtitle: "Full leg relaxation and circulation boost",
                    image: "https://source.unsplash.com/400x400/?leg,massage",

                    price: 499,
                    oldPrice: 999,
                    discountPercent: 50,

                    duration: "20 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.78, count: 2631 },

                    overview: [
                        { title: "Leg Muscle Relief", desc: "Ideal for runners & gym-goers." }
                    ],

                    things_to_know: [
                        "Avoid with varicose vein flare-ups.",
                        "Light oil used.",
                        "Pressure fully adjustable."
                    ],

                    after_care: [
                        "Stretch calves lightly.",
                        "Drink water.",
                        "Avoid running for a few hours."
                    ],

                    faq: [
                        {
                            question: "Is this good after leg day?",
                            answer: "Yes, reduces soreness and stiffness."
                        }
                    ]
                },

                {
                    id: "sports-therapy",
                    belongs_to: ["pain_relief"],
                    withFilter: [],

                    title: "Sports Therapy",
                    subtitle: "Deep pressure therapy for athletes & active men",
                    image: "https://source.unsplash.com/400x400/?sports,massage",

                    price: 1499,
                    oldPrice: 2899,
                    discountPercent: 48,

                    duration: "60 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.81, count: 3298 },

                    overview: [
                        { title: "Muscle Conditioning", desc: "Helps recovery after intense activity." },
                        { title: "Deep Tissue", desc: "Targets chronic tightness & knots." }
                    ],

                    things_to_know: [
                        "Very strong pressure; inform therapist beforehand.",
                        "Soreness for 24 hours is normal.",
                        "Avoid if you have inflammation."
                    ],

                    after_care: [
                        "Apply ice pack if sore.",
                        "Hydrate properly.",
                        "Avoid intense workouts immediately."
                    ],

                    faq: [
                        {
                            question: "Is it like deep tissue?",
                            answer: "Yes, but more athletic-focused."
                        }
                    ]
                }
            ]
        },

        // =============================
        // 3) SKINCARE & SCRUBS
        // =============================
        {
            id: "skincare_scrubs",
            name: "Skincare & Scrubs",
            filters: ["All"],
            packages: [
                {
                    id: "face-neck-dtan",
                    belongs_to: ["skincare_scrubs"],
                    withFilter: [],

                    title: "Face & Neck D-Tan",
                    subtitle: "Instant tan removal & brightening",
                    image: "https://source.unsplash.com/400x400/?facial,detan",

                    price: 449,
                    oldPrice: 899,
                    discountPercent: 50,

                    duration: "20 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.76, count: 5211 },

                    overview: [
                        { title: "Instant Brightening", desc: "Removes tan & dullness." }
                    ],

                    things_to_know: [
                        "Patch test done if sensitive skin.",
                        "Avoid sun right after.",
                        "Suitable for oily or sweaty skin."
                    ],

                    after_care: [
                        "Use sunscreen.",
                        "Avoid harsh scrubs for 12 hours.",
                        "Keep skin moisturised."
                    ],

                    faq: [
                        {
                            question: "Is D-tan a bleach?",
                            answer: "No, it is a tan removal pack without bleach."
                        }
                    ]
                },

                {
                    id: "full-body-scrub",
                    belongs_to: ["skincare_scrubs"],
                    withFilter: [],

                    title: "Full Body Scrub",
                    subtitle: "Deep exfoliation for glowing skin",
                    image: "https://source.unsplash.com/400x400/?bodyscrub,spa",

                    price: 1199,
                    oldPrice: 2299,
                    discountPercent: 48,

                    duration: "45 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.79, count: 3012 },

                    overview: [
                        { title: "Dead Skin Removal", desc: "Removes buildup and rough patches." },
                        { title: "Glow Boost", desc: "Improves skin tone and softness." }
                    ],

                    things_to_know: [
                        "Avoid if skin is irritated.",
                        "Light pressure used for exfoliation.",
                        "Suitable for all skin types."
                    ],

                    after_care: [
                        "Apply moisturiser immediately.",
                        "Avoid hot shower for 1 hour.",
                        "Hydrate well."
                    ],

                    faq: [
                        {
                            question: "Is scrubbing painful?",
                            answer: "No, pressure is gentle and adjustable."
                        }
                    ]
                },

                {
                    id: "full-back-scrub",
                    belongs_to: ["skincare_scrubs"],
                    withFilter: [],

                    title: "Full Back Scrub",
                    subtitle: "Brightening & exfoliation for the back",
                    image: "https://source.unsplash.com/400x400/?back,scrub",

                    price: 599,
                    oldPrice: 1299,
                    discountPercent: 54,

                    duration: "25 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.71, count: 1922 },

                    overview: [
                        { title: "Back Exfoliation", desc: "Removes dead skin & bacne buildup." }
                    ],

                    things_to_know: [
                        "Avoid during active acne flare-ups.",
                        "Mild redness is normal.",
                        "Deep scrub if requested."
                    ],

                    after_care: [
                        "Use soothing gel.",
                        "Avoid sweating for 1 hour.",
                        "Wear loose clothing."
                    ],

                    faq: [
                        {
                            question: "Will this help with back acne?",
                            answer: "It cleanses deeply but does not treat acne."
                        }
                    ]
                },

                {
                    id: "full-arms-scrub",
                    belongs_to: ["skincare_scrubs"],
                    withFilter: [],

                    title: "Full Arms Scrub",
                    subtitle: "Removes tan & roughness",
                    image: "https://source.unsplash.com/400x400/?arms,scrub",

                    price: 499,
                    oldPrice: 999,
                    discountPercent: 50,

                    duration: "20 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.73, count: 2138 },

                    overview: [
                        { title: "Tan Removal", desc: "Smoothens rough & tanned skin." }
                    ],

                    things_to_know: [
                        "Not suitable on wounds.",
                        "Mild pressure used.",
                        "Suitable for all skin types."
                    ],

                    after_care: [
                        "Apply moisturiser.",
                        "Avoid workouts for 1 hour.",
                        "Use sunscreen."
                    ],

                    faq: [
                        {
                            question: "Does it lighten skin?",
                            answer: "It removes tan, not skin colour."
                        }
                    ]
                },

                {
                    id: "full-legs-scrub",
                    belongs_to: ["skincare_scrubs"],
                    withFilter: [],

                    title: "Full Legs Scrub",
                    subtitle: "Smooth & glowing legs",
                    image: "https://source.unsplash.com/400x400/?legs,scrub",

                    price: 549,
                    oldPrice: 1099,
                    discountPercent: 50,

                    duration: "20 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.74, count: 1711 },

                    overview: [
                        { title: "Exfoliation", desc: "Removes dead cells & rough patches." }
                    ],

                    things_to_know: [
                        "Avoid right after waxing.",
                        "Not for cracked skin.",
                        "Suitable for all skin types."
                    ],

                    after_care: [
                        "Moisturise well.",
                        "Avoid sun for 1 hour.",
                        "Stay hydrated."
                    ],

                    faq: [
                        {
                            question: "Can I scrub after waxing?",
                            answer: "Wait at least 24 hours."
                        }
                    ]
                }
            ]
        },

        // =============================
        // 4) MONTHLY NECESSITY
        // =============================
        {
            id: "monthly_necessity",
            name: "Monthly Necessity",
            filters: ["All"],
            packages: [
                {
                    id: "quick-fix-beard-trim-dtan",
                    belongs_to: ["monthly_necessity"],
                    withFilter: [],

                    title: "Quick Fix Beard Trim + Face D-Tan",
                    subtitle: "Clean grooming + instant brightness",
                    image: "https://source.unsplash.com/400x400/?beard,grooming",

                    price: 449,
                    oldPrice: 999,
                    discountPercent: 55,

                    duration: "30 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.72, count: 3121 },

                    overview: [
                        { title: "Beard Shaping", desc: "Quick trim + shape up." },
                        { title: "Instant Brightness", desc: "D-Tan removes dullness." }
                    ],

                    things_to_know: [
                        "Suitable for all beard types.",
                        "Avoid D-tan if severely sensitive."
                    ],

                    after_care: [
                        "Avoid washing face for 30 mins.",
                        "Use moisturiser.",
                        "Apply sunscreen."
                    ],

                    faq: [
                        {
                            question: "Is D-tan safe for men?",
                            answer: "Yes, especially formulated for male skin."
                        }
                    ]
                },

                {
                    id: "unwind-stress-massage",
                    belongs_to: ["monthly_necessity"],
                    withFilter: [],

                    title: "Unwind Stress - Head, Neck & Shoulder Massage",
                    subtitle: "Quick relaxation booster",
                    image: "https://source.unsplash.com/400x400/?massage,relaxation",

                    price: 349,
                    oldPrice: 699,
                    discountPercent: 50,

                    duration: "15 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.79, count: 5259 },

                    overview: [
                        { title: "Quick Relief", desc: "Perfect for mid-week relaxation." }
                    ],

                    things_to_know: [
                        "Light-to-medium pressure.",
                        "Avoid during migraines.",
                        "Oil optional."
                    ],

                    after_care: [
                        "Rest for 10 mins.",
                        "Avoid screens immediately."
                    ],

                    faq: [
                        {
                            question: "Is oil mandatory?",
                            answer: "No, fully optional."
                        }
                    ]
                },

                {
                    id: "body-trimming",
                    belongs_to: ["monthly_necessity"],
                    withFilter: [],

                    title: "Body Trimming",
                    subtitle: "Hygienic body hair trimming",
                    image: "https://source.unsplash.com/400x400/?body,haircut",

                    price: 549,
                    oldPrice: 999,
                    discountPercent: 45,

                    duration: "35 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.70, count: 1742 },

                    overview: [
                        { title: "Clean & Hygienic", desc: "Trimmer-based body hair grooming." }
                    ],

                    things_to_know: [
                        "Only trimming, no shaving.",
                        "Avoid if skin has cuts.",
                        "Length adjustable on request."
                    ],

                    after_care: [
                        "Apply aloe gel.",
                        "Avoid sweating for 30 mins."
                    ],

                    faq: [
                        {
                            question: "Does trimming cause itching?",
                            answer: "Mild itching is normal for 1–2 hours."
                        }
                    ]
                }
            ]
        },

        // =============================
        // 5) FACE GROOMING
        // =============================
        {
            id: "face_grooming",
            name: "Face Grooming",
            filters: ["All"],
            packages: [
                {
                    id: "korean-facial-glow-men",
                    belongs_to: ["face_grooming"],
                    withFilter: [],

                    title: "Korean Facial Glow",
                    subtitle: "Glass-skin inspired brightening facial",
                    image: "https://source.unsplash.com/400x400/?korean,facial",

                    price: 999,
                    oldPrice: 1999,
                    discountPercent: 50,

                    duration: "50 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.83, count: 4988 },

                    overview: [
                        { title: "Deep Brightening", desc: "Improves clarity & hydration." },
                        { title: "Korean Glow", desc: "Gives smooth, luminous finish." }
                    ],

                    things_to_know: [
                        "Avoid immediately after shaving.",
                        "Steam optional.",
                        "Patch test included."
                    ],

                    after_care: [
                        "Avoid sun for few hours.",
                        "Use sunscreen.",
                        "Don't scrub for 24 hours."
                    ],

                    faq: [
                        {
                            question: "Is this good for oily skin?",
                            answer: "Yes, customised for all skin types."
                        }
                    ]
                },

                {
                    id: "charcoal-facial-men",
                    belongs_to: ["face_grooming"],
                    withFilter: [],

                    title: "Charcoal Facial",
                    subtitle: "Detox facial for acne-prone skin",
                    image: "https://source.unsplash.com/400x400/?charcoal,facial",

                    price: 699,
                    oldPrice: 1399,
                    discountPercent: 50,

                    duration: "40 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.68, count: 2120 },

                    overview: [
                        { title: "Detox Spa", desc: "Charcoal unclogs pores & reduces excess oil." }
                    ],

                    things_to_know: [
                        "Avoid during active acne breakout.",
                        "Slight tingling is normal.",
                        "Steam optional."
                    ],

                    after_care: [
                        "Avoid sun for some time.",
                        "Use gentle moisturiser.",
                        "No scrub for 24 hrs."
                    ],

                    faq: [
                        {
                            question: "Does charcoal dry out skin?",
                            answer: "No, balanced formula prevents dryness."
                        }
                    ]
                },

                {
                    id: "fruit-facial-men",
                    belongs_to: ["face_grooming"],
                    withFilter: [],

                    title: "Fruit Facial",
                    subtitle: "Gentle glow facial with fruit enzymes",
                    image: "https://source.unsplash.com/400x400/?fruit,facial",

                    price: 649,
                    oldPrice: 1299,
                    discountPercent: 50,

                    duration: "40 mins",
                    bookings: "",
                    avatar:"",
                    gender: "M",
                    features: [],

                    ratings: { score: 4.71, count: 1521 },

                    overview: [
                        { title: "Soft Glow", desc: "Fruit enzymes brighten & nourish skin." }
                    ],

                    things_to_know: [
                        "Suitable for sensitive skin.",
                        "Avoid if allergic to fruit extracts."
                    ],

                    after_care: [
                        "Stay hydrated.",
                        "Avoid sun exposure.",
                        "Use moisturiser."
                    ],

                    faq: [
                        {
                            question: "Is fruit facial mild?",
                            answer: "Yes, excellent for beginner skincare."
                        }
                    ]
                }
            ]
        }
    ]
};

export default men
