import { type Cta, type PageContent, type Section, type SectionOf, siteImage } from "@brand/shared";
import { LEGAL_DOCS } from "./legalDefaults";

// The pages the website ships with. They are served as they are until an admin edits them,
// and "Reset to default" brings an edited page back to this. Text may use {{variables}}
// (see TEXT_VARIABLES): prices, hours and contacts come from the live settings that way.

const t = (en: string, hi: string) => ({ en, hi });
const none = t("", "");
const cta = (label: { en: string; hi: string }, href: string): Cta => ({ label, href });
const noCta: Cta = { label: none, href: "" };
const seo = (description: { en: string; hi: string } = none, title = none) => ({ title, description, image: null, noindex: false });
const base = (id: string, anchor = "", tone: Section["tone"] = "plain") => ({ id, visible: true, anchor, tone });

const BOOK = cta(t("Book now", "अभी बुक करें"), "/services");

const FAQ_ITEMS = [
  {
    question: t("How fast will someone arrive?", "कोई कितनी जल्दी पहुँचेगा?"),
    answer: t(
      "Usually within {{min}}–{{max}} minutes of paying, depending on traffic and how many professionals are free near you. You see their live location and a time estimate.",
      "आम तौर पर भुगतान के {{min}}–{{max}} मिनट में, ट्रैफ़िक और आपके पास कितने प्रोफेशनल खाली हैं इस पर निर्भर करता है। आप उनकी लाइव लोकेशन और पहुँचने का अनुमानित समय देखते हैं।",
    ),
  },
  {
    question: t("What if no professional is free?", "अगर कोई प्रोफेशनल खाली न हो तो?"),
    answer: t(
      "We keep looking for {{searchMinutes}} minutes. If no one accepts, you get a full refund automatically, to the same way you paid.",
      "हम {{searchMinutes}} मिनट तक ढूँढते हैं। अगर कोई स्वीकार न करे, तो पूरा पैसा अपने आप उसी तरीक़े में वापस आ जाता है जिससे आपने भुगतान किया था।",
    ),
  },
  {
    question: t("Do I pay before the service?", "क्या सेवा से पहले भुगतान करना होगा?"),
    answer: t(
      "Yes, you pay online when you book. The price you see before paying is final: taxes are included and there are no extra charges at your door.",
      "हाँ, बुकिंग के समय ऑनलाइन भुगतान होता है। भुगतान से पहले दिखी क़ीमत ही अंतिम है: टैक्स शामिल है और दरवाज़े पर कोई अतिरिक्त शुल्क नहीं।",
    ),
  },
  {
    question: t("Can I ask for a female professional?", "क्या महिला प्रोफेशनल चुनी जा सकती है?"),
    answer: t(
      "Yes. At checkout you can ask for a female or male professional, or choose no preference to get someone faster.",
      "हाँ। चेकआउट पर आप महिला या पुरुष प्रोफेशनल चुन सकते हैं, या जल्दी किसी को पाने के लिए “कोई भी” चुनें।",
    ),
  },
  {
    question: t("What does the professional bring?", "प्रोफेशनल साथ में क्या लाते हैं?"),
    answer: t(
      "Everything your service needs: products, tools and disposable sheets. Please keep a clean space and a power socket ready.",
      "आपकी सेवा के लिए सब कुछ: प्रोडक्ट, औज़ार और डिस्पोज़ेबल शीट। बस एक साफ़ जगह और बिजली का सॉकेट तैयार रखें।",
    ),
  },
  {
    question: t("Can I cancel a booking?", "क्या मैं बुकिंग रद्द कर सकता/सकती हूँ?"),
    answer: t(
      "Yes. Cancelling while we're still finding a professional is free. After a professional accepts, a fee of {{cancelFee}} applies because they have already set out; the rest is refunded.",
      "हाँ। जब तक हम प्रोफेशनल ढूँढ रहे हैं, रद्द करना मुफ़्त है। प्रोफेशनल के स्वीकार करने के बाद {{cancelFee}} का शुल्क लगता है क्योंकि वे निकल चुके होते हैं; बाक़ी पैसा वापस हो जाता है।",
    ),
  },
];

const STEPS: SectionOf<"steps"> = {
  ...base("howsteps", "how-it-works", "soft"),
  type: "steps",
  eyebrow: t("Simple and safe", "आसान और सुरक्षित"),
  title: t("How it works", "कैसे काम करता है"),
  subtitle: t("Three steps from booking to a fresh new you.", "बुकिंग से निखरे हुए आप तक, बस तीन क़दम।"),
  items: [
    {
      image: siteImage("step-book"),
      title: t("Choose and pay", "चुनें और भुगतान करें"),
      body: t("See the full price before you pay. Taxes are included and nothing is added at your door.", "भुगतान से पहले पूरी क़ीमत देखें। टैक्स शामिल है और दरवाज़े पर कुछ नहीं जुड़ता।"),
    },
    {
      image: siteImage("step-arrive"),
      title: t("We find the nearest professional", "हम पास का प्रोफेशनल ढूँढते हैं"),
      body: t(
        "A free, verified professional near you accepts within seconds. If no one is free, your money comes back automatically.",
        "आपके पास का खाली, वेरिफ़ाइड प्रोफेशनल कुछ ही सेकंड में काम स्वीकार करता है। अगर कोई खाली न हो, तो पैसा अपने आप वापस आ जाता है।",
      ),
    },
    {
      image: siteImage("step-relax"),
      title: t("Track and relax", "देखें और आराम करें"),
      body: t("Follow them on the map. The service starts only when you share your 4-digit OTP.", "उन्हें नक्शे पर आते देखें। सेवा तभी शुरू होती है जब आप अपना 4 अंकों का OTP बताते हैं।"),
    },
  ],
};

const STATS: SectionOf<"stats"> = {
  ...base("homestats", "", "plain"),
  type: "stats",
  eyebrow: none,
  title: none,
  subtitle: none,
  items: [
    { icon: "clock", value: t("{{min}}–{{max}} min", "{{min}}–{{max}} मिनट"), label: t("A professional at your door", "आपके दरवाज़े पर प्रोफेशनल") },
    { icon: "spa", value: t("{{services}}+", "{{services}}+"), label: t("Services to choose from", "चुनने के लिए सेवाएँ") },
    { icon: "calendar", value: t("7 days", "सातों दिन"), label: t("Open {{open}} – {{close}}", "{{open}} – {{close}} खुला") },
    { icon: "wallet", value: t("₹0", "₹0"), label: t("Extra charges at your door", "दरवाज़े पर अतिरिक्त शुल्क") },
  ],
};

const FEATURES: SectionOf<"features"> = {
  ...base("whyusfeat", "why-us", "plain"),
  type: "features",
  eyebrow: t("Why people book with us", "लोग हमें क्यों चुनते हैं"),
  title: t("Safe, simple and on time", "सुरक्षित, आसान और समय पर"),
  subtitle: t("Everything is built so you can relax from the moment you book.", "सब कुछ ऐसा बनाया गया है कि बुकिंग के पल से ही आप बेफ़िक्र रहें।"),
  image: siteImage("why-us"),
  items: [
    {
      icon: "verified",
      title: t("Verified professionals", "वेरिफ़ाइड प्रोफेशनल"),
      body: t("We check every professional's identity and work before their first booking.", "पहली बुकिंग से पहले हम हर प्रोफेशनल की पहचान और काम जाँचते हैं।"),
    },
    {
      icon: "lock",
      title: t("Starts only with your OTP", "आपके OTP से ही शुरुआत"),
      body: t(
        "The service begins when you share a 4-digit code at the door, so you always know who you let in.",
        "सेवा तभी शुरू होती है जब आप दरवाज़े पर 4 अंकों का कोड बताते हैं, ताकि आपको पता रहे कि घर में कौन आया।",
      ),
    },
    {
      icon: "price",
      title: t("One clear price", "एक साफ़ क़ीमत"),
      body: t("Prices include taxes. The total you see before paying is the total you pay.", "क़ीमतों में टैक्स शामिल है। भुगतान से पहले जो कुल दिखता है, वही आप चुकाते हैं।"),
    },
    {
      icon: "hygiene",
      title: t("Everything brought to you", "सब कुछ आपके पास"),
      body: t("Professionals bring their own products, tools and disposable sheets for your service.", "प्रोफेशनल आपकी सेवा के लिए अपने प्रोडक्ट, औज़ार और डिस्पोज़ेबल शीट साथ लाते हैं।"),
    },
    {
      icon: "location",
      title: t("Track them live", "लाइव ट्रैक करें"),
      body: t("Follow your professional on the map until they reach your door.", "दरवाज़े तक पहुँचने तक अपने प्रोफेशनल को नक्शे पर देखें।"),
    },
    {
      icon: "wallet",
      title: t("Money back automatically", "पैसा अपने आप वापस"),
      body: t("If no professional is free, your full payment is refunded on its own.", "अगर कोई प्रोफेशनल खाली न हो, तो आपका पूरा भुगतान अपने आप वापस हो जाता है।"),
    },
  ],
};

const TESTIMONIALS: SectionOf<"testimonials"> = {
  ...base("reviews", "reviews", "soft"),
  type: "testimonials",
  eyebrow: t("Reviews", "रिव्यू"),
  title: t("Loved by our customers", "हमारे ग्राहकों की पसंद"),
  subtitle: t("Real ratings from customers after their booking.", "बुकिंग के बाद ग्राहकों की असली रेटिंग।"),
  source: "reviews",
  items: [],
};

const JOIN_PROS: SectionOf<"joinPros"> = {
  ...base("joinpros", "", "accent"),
  type: "joinPros",
  eyebrow: t("For beauty professionals", "ब्यूटी प्रोफेशनल के लिए"),
  title: t("Are you a beauty professional?", "क्या आप ब्यूटी प्रोफेशनल हैं?"),
  subtitle: t("Get bookings near you, on your own hours. There is no joining fee.", "अपने इलाक़े में अपने समय पर बुकिंग पाएँ। जुड़ने की कोई फ़ीस नहीं।"),
  image: siteImage("join-pro"),
  points: [t("Go online when you want", "जब चाहें ऑनलाइन हों"), t("Jobs near your home", "घर के पास काम"), t("Log in with your mobile number", "मोबाइल नंबर से लॉग इन"), t("No joining fee", "जुड़ने की कोई फ़ीस नहीं")],
  cta: cta(t("Register as a Professional", "प्रोफेशनल के रूप में जुड़ें"), "/register-as-professional"),
};

const READY: SectionOf<"cta"> = {
  ...base("readycta", "", "dark"),
  type: "cta",
  eyebrow: none,
  title: t("Ready when you are", "जब आप तैयार हों"),
  subtitle: t("Pick a service and a professional can be on the way in minutes.", "सेवा चुनें, और कुछ ही मिनटों में प्रोफेशनल रास्ते में हो सकता है।"),
  image: siteImage("offer-first"),
  primary: BOOK,
  secondary: cta(t("Talk to us", "हमसे बात करें"), "/contact"),
};

const categories = (id: string, anchor = "categories"): Section => ({
  ...base(id, anchor, "plain"),
  type: "categories",
  eyebrow: t("Instant salon at home", "घर पर तुरंत सैलून"),
  title: t("Arriving in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में आपके पास"),
  subtitle: t("Choose a category to see every service and its price.", "हर सेवा और उसकी क़ीमत देखने के लिए श्रेणी चुनें।"),
  layout: "tabs",
  style: "cards",
  showPrices: true,
  cta: cta(t("View all services", "सभी सेवाएँ देखें"), "/services"),
});

const popular = (id: string): Section => ({
  ...base(id, "popular", "soft"),
  type: "services",
  eyebrow: t("Salon at home", "घर पर सैलून"),
  title: t("Popular services", "लोकप्रिय सेवाएँ"),
  subtitle: t("Clear prices with taxes included. Add to cart in one tap.", "टैक्स सहित साफ़ क़ीमतें। एक टैप में कार्ट में जोड़ें।"),
  mode: "auto",
  gender: "all",
  slugs: [],
  limit: 8,
  cta: cta(t("View all services", "सभी सेवाएँ देखें"), "/services"),
});

const HOME: PageContent = {
  title: t("Home", "होम"),
  seo: seo(
    t(
      "Book a verified beauty professional to your door in {{min}}–{{max}} minutes. Pay online, track them live, start with your OTP.",
      "{{min}}–{{max}} मिनट में वेरिफ़ाइड ब्यूटी प्रोफेशनल को घर बुलाएँ। ऑनलाइन भुगतान करें, लाइव ट्रैक करें, OTP से शुरू करें।",
    ),
    t("Salon, spa and grooming at home in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में घर पर सैलून, स्पा और ग्रूमिंग"),
  ),
  sections: [
    {
      ...base("homehero", "", "dark"),
      type: "hero",
      autoplaySeconds: 6,
      showPromise: true,
      height: "large",
      slides: [
        {
          image: siteImage("hero-facial"),
          mobileImage: null,
          video: "/video/hero.mp4",
          eyebrow: t("Salon, spa and grooming at home", "घर पर सैलून, स्पा और ग्रूमिंग"),
          title: t("Salon at home", "घर पर सैलून"),
          accent: t("in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में"),
          subtitle: t(
            "Certified beauty experts at your doorstep: facials, waxing, makeup, massage and grooming at one clear price.",
            "प्रमाणित ब्यूटी एक्सपर्ट आपके दरवाज़े पर: फ़ेशियल, वैक्सिंग, मेकअप, मसाज और ग्रूमिंग, एक साफ़ क़ीमत पर।",
          ),
          primary: BOOK,
          secondary: cta(t("View services", "सेवाएँ देखें"), "/#categories"),
          align: "left",
        },
        {
          image: siteImage("hero-bridal"),
          mobileImage: null,
          video: "",
          eyebrow: t("Makeup and styling", "मेकअप और स्टाइलिंग"),
          title: t("Party and bridal makeup", "पार्टी और ब्राइडल मेकअप"),
          accent: t("at your home", "आपके घर पर"),
          subtitle: t(
            "Professional makeup artists with premium products, for your big day or a night out.",
            "प्रीमियम प्रोडक्ट के साथ प्रोफेशनल मेकअप आर्टिस्ट, आपके ख़ास दिन या किसी पार्टी के लिए।",
          ),
          primary: cta(t("Book makeup", "मेकअप बुक करें"), "/services?category=makeup-and-styling"),
          secondary: noCta,
          align: "left",
        },
        {
          image: siteImage("hero-men"),
          mobileImage: null,
          video: "",
          eyebrow: t("For men", "पुरुषों के लिए"),
          title: t("Grooming and massage", "ग्रूमिंग और मसाज"),
          accent: t("without leaving home", "घर बैठे"),
          subtitle: t(
            "Haircut, beard, skincare and pain-relief massage by verified professionals.",
            "वेरिफ़ाइड प्रोफेशनल से हेयरकट, दाढ़ी, स्किनकेयर और दर्द से राहत वाली मसाज।",
          ),
          primary: cta(t("Explore men's services", "पुरुषों की सेवाएँ देखें"), "/services?gender=men"),
          secondary: noCta,
          align: "left",
        },
      ],
    },
    categories("homecats"),
    {
      ...base("homeoffers", "offers", "plain"),
      type: "offers",
      eyebrow: t("Picked for you", "आपके लिए"),
      title: t("Treat yourself today", "आज ख़ुद को तोहफ़ा दें"),
      subtitle: none,
      items: [
        {
          image: siteImage("offer-first"),
          badge: t("Most booked", "सबसे ज़्यादा बुक"),
          title: t("Glow facials at home", "घर पर ग्लो फ़ेशियल"),
          subtitle: t("Korean, O3+ and fruit facials by trained experts.", "प्रशिक्षित एक्सपर्ट से कोरियन, O3+ और फ़्रूट फ़ेशियल।"),
          cta: cta(t("Book a facial", "फ़ेशियल बुक करें"), "/services?category=salon-for-women"),
        },
        {
          image: siteImage("offer-bridal"),
          badge: t("For your big day", "आपके ख़ास दिन के लिए"),
          title: t("Bridal and party makeup", "ब्राइडल और पार्टी मेकअप"),
          subtitle: t("HD and airbrush looks, hair styling and draping.", "HD और एयरब्रश लुक, हेयर स्टाइलिंग और साड़ी ड्रेपिंग।"),
          cta: cta(t("See makeup", "मेकअप देखें"), "/services?category=makeup-and-styling"),
        },
        {
          image: siteImage("offer-men"),
          badge: t("For men", "पुरुषों के लिए"),
          title: t("Grooming at home", "घर पर ग्रूमिंग"),
          subtitle: t("Haircut, beard styling, face care and massage.", "हेयरकट, दाढ़ी स्टाइलिंग, फ़ेस केयर और मसाज।"),
          cta: cta(t("See men's services", "पुरुषों की सेवाएँ"), "/services?gender=men"),
        },
      ],
    },
    popular("homepopular"),
    {
      ...base("homeposters", "", "plain"),
      type: "categories",
      eyebrow: t("Something for everyone", "सबके लिए कुछ ख़ास"),
      title: t("Explore by category", "श्रेणी के हिसाब से देखें"),
      subtitle: none,
      layout: "split",
      style: "posters",
      showPrices: true,
      cta: noCta,
    },
    STEPS,
    STATS,
    FEATURES,
    TESTIMONIALS,
    {
      ...base("homefaq", "faq", "plain"),
      type: "faq",
      eyebrow: t("Help", "मदद"),
      title: t("Questions people ask", "लोग अक्सर पूछते हैं"),
      subtitle: none,
      items: FAQ_ITEMS,
      showContact: true,
    },
    JOIN_PROS,
    {
      ...base("homeareas", "areas", "plain"),
      type: "areas",
      eyebrow: t("Where we serve", "हम कहाँ सेवा देते हैं"),
      title: t("Salon at home near you", "आपके पास घर पर सैलून"),
      subtitle: none,
      items: [],
      showServed: true,
      body: t(
        "{{brand}} brings salon, spa and grooming services to your home, done by verified professionals who reach you in {{min}}–{{max}} minutes. Book facials, waxing, threading, manicure and pedicure, hair styling, party and bridal makeup, body massage and men's grooming, and pay one clear price with taxes included. Allow your location or enter your address at checkout to see whether we serve your area.\n\nSee [Salon at home in Faridabad](/faridabad-at-home-services).",
        "{{brand}} आपके घर पर सैलून, स्पा और ग्रूमिंग सेवाएँ लाता है, वेरिफ़ाइड प्रोफेशनल के हाथों जो {{min}}–{{max}} मिनट में आप तक पहुँचते हैं। फ़ेशियल, वैक्सिंग, थ्रेडिंग, मैनीक्योर-पेडीक्योर, हेयर स्टाइलिंग, पार्टी और ब्राइडल मेकअप, बॉडी मसाज और पुरुषों की ग्रूमिंग बुक करें, और टैक्स सहित एक साफ़ क़ीमत चुकाएँ। आपका इलाक़ा हमारी सेवा में है या नहीं, यह देखने के लिए लोकेशन की अनुमति दें या चेकआउट पर पता डालें।\n\nदेखें: [फ़रीदाबाद में घर पर सैलून](/faridabad-at-home-services)।",
      ),
    },
    READY,
  ],
};

const ABOUT: PageContent = {
  title: t("About us", "हमारे बारे में"),
  seo: seo(
    t(
      "We bring salon, spa and grooming services to your home in minutes, done by verified professionals, at prices you see before you pay.",
      "हम वेरिफ़ाइड प्रोफेशनल के ज़रिए कुछ ही मिनटों में घर पर सैलून, स्पा और ग्रूमिंग सेवाएँ लाते हैं, भुगतान से पहले दिखी क़ीमत पर।",
    ),
  ),
  sections: [
    {
      ...base("abouthead", "", "soft"),
      type: "pageHeader",
      eyebrow: t("About us", "हमारे बारे में"),
      title: t("Beauty care that comes to you", "ब्यूटी केयर, जो आपके पास आए"),
      subtitle: t(
        "We bring salon, spa and grooming services to your home in minutes, done by verified professionals, at prices you see before you pay.",
        "हम वेरिफ़ाइड प्रोफेशनल के ज़रिए कुछ ही मिनटों में घर पर सैलून, स्पा और ग्रूमिंग सेवाएँ लाते हैं, भुगतान से पहले दिखी क़ीमत पर।",
      ),
      image: siteImage("about-main"),
      primary: BOOK,
    },
    {
      ...base("aboutwhat", "what-we-do", "plain"),
      type: "imageText",
      eyebrow: t("What we do", "हम क्या करते हैं"),
      title: t("A salon visit, without the visit", "सैलून जाए बिना सैलून जैसी सेवा"),
      subtitle: none,
      body: t(
        "Book a service and the nearest free professional accepts within seconds and comes to you. You follow them on a live map, and the service starts only when you share your OTP.\n\n- Facials, waxing, threading, manicure and pedicure\n- Hair styling, party and bridal makeup\n- Body massage and spa\n- Haircut, beard, skincare and massage for men",
        "सेवा बुक करें और पास का खाली प्रोफेशनल कुछ ही सेकंड में स्वीकार करके आपके पास आता है। आप नक्शे पर उन्हें आते देखते हैं, और सेवा तभी शुरू होती है जब आप OTP बताते हैं।\n\n- फ़ेशियल, वैक्सिंग, थ्रेडिंग, मैनीक्योर और पेडीक्योर\n- हेयर स्टाइलिंग, पार्टी और ब्राइडल मेकअप\n- बॉडी मसाज और स्पा\n- पुरुषों के लिए हेयरकट, दाढ़ी, स्किनकेयर और मसाज",
      ),
      image: siteImage("about-team"),
      imageSide: "right",
      cta: cta(t("See all services", "सभी सेवाएँ देखें"), "/services"),
    },
    {
      ...base("aboutpros", "", "soft"),
      type: "imageText",
      eyebrow: t("Our professionals", "हमारे प्रोफेशनल"),
      title: t("How we choose professionals", "हम प्रोफेशनल कैसे चुनते हैं"),
      subtitle: none,
      body: t(
        "Every professional applies with their identity documents and work experience. We check both before their first booking, and we watch ratings and feedback after every job.",
        "हर प्रोफेशनल अपनी पहचान के दस्तावेज़ और काम के अनुभव के साथ आवेदन करता है। पहली बुकिंग से पहले हम दोनों जाँचते हैं, और हर काम के बाद रेटिंग और फ़ीडबैक पर नज़र रखते हैं।",
      ),
      image: siteImage("why-us"),
      imageSide: "left",
      cta: noCta,
    },
    { ...STATS, id: "aboutstats" },
    {
      ...base("aboutpromise", "", "plain"),
      type: "features",
      eyebrow: t("Our promise", "हमारा वादा"),
      title: t("What you can count on", "जिस पर आप भरोसा कर सकते हैं"),
      subtitle: t(
        "One clear price with taxes included, no charges at your door, and your money back automatically if no one is free.",
        "टैक्स सहित एक साफ़ क़ीमत, दरवाज़े पर कोई शुल्क नहीं, और कोई खाली न हो तो पैसा अपने आप वापस।",
      ),
      image: null,
      items: [...FEATURES.items.slice(0, 3), ...FEATURES.items.slice(5)],
    },
    { ...JOIN_PROS, id: "aboutjoin" },
  ],
};

const CONTACT: PageContent = {
  title: t("Contact us", "संपर्क करें"),
  seo: seo(t("Questions about a booking or our services? Write to us and we'll reply within one working day.", "बुकिंग या हमारी सेवाओं के बारे में कोई सवाल? हमें लिखें, हम एक कामकाजी दिन के अंदर जवाब देंगे।")),
  sections: [
    {
      ...base("contacthead", "", "soft"),
      type: "pageHeader",
      eyebrow: t("We're here to help", "हम मदद के लिए हैं"),
      title: t("Contact us", "संपर्क करें"),
      subtitle: t(
        "Questions about a booking or our services? Write to us and we'll reply within one working day.",
        "बुकिंग या हमारी सेवाओं के बारे में कोई सवाल? हमें लिखें, हम एक कामकाजी दिन के अंदर जवाब देंगे।",
      ),
      image: siteImage("contact-main"),
      primary: noCta,
    },
    {
      ...base("contactform", "write", "plain"),
      type: "contactForm",
      eyebrow: none,
      title: t("Write to us", "हमें लिखें"),
      subtitle: t("If it's about a booking, add the booking number.", "अगर बात किसी बुकिंग की है, तो बुकिंग नंबर भी लिखें।"),
      showDetails: true,
    },
    {
      ...base("contactfaq", "faq", "soft"),
      type: "faq",
      eyebrow: none,
      title: t("Quick answers", "जल्दी जवाब"),
      subtitle: none,
      items: [...FAQ_ITEMS.slice(0, 3), ...FAQ_ITEMS.slice(5)],
      showContact: false,
    },
  ],
};

const JOIN: PageContent = {
  title: t("Join as a professional", "प्रोफेशनल के रूप में जुड़ें"),
  seo: seo(
    t(
      "Get bookings near you, on your own hours. You choose when you're online; we send you nearby jobs and pay you for every one you complete.",
      "अपने समय पर अपने पास की बुकिंग पाएँ। आप तय करते हैं कि कब ऑनलाइन रहना है; हम आपको पास के काम भेजते हैं और पूरे किए गए हर काम का भुगतान करते हैं।",
    ),
  ),
  sections: [
    {
      ...base("joinhead", "", "soft"),
      type: "pageHeader",
      eyebrow: t("Careers", "करियर"),
      title: t("Join as a professional", "प्रोफेशनल के रूप में जुड़ें"),
      subtitle: t(
        "Get bookings near you, on your own hours. You choose when you're online; we send you nearby jobs and pay you for every one you complete.",
        "अपने समय पर अपने पास की बुकिंग पाएँ। आप तय करते हैं कि कब ऑनलाइन रहना है; हम आपको पास के काम भेजते हैं और पूरे किए गए हर काम का भुगतान करते हैं।",
      ),
      image: siteImage("join-pro"),
      primary: cta(t("Apply now", "अभी आवेदन करें"), "#apply"),
    },
    {
      ...base("joinwhy", "", "plain"),
      type: "features",
      eyebrow: t("Why join us", "हमसे क्यों जुड़ें"),
      title: t("Work on your own terms", "अपनी शर्तों पर काम करें"),
      subtitle: none,
      image: null,
      items: [
        { icon: "clock", title: t("Your own hours", "अपना समय"), body: t("Tap Online when you want jobs and Offline when you don't.", "काम चाहिए तो Online दबाएँ, नहीं तो Offline।") },
        { icon: "location", title: t("Jobs near you", "पास में काम"), body: t("We offer you bookings close to where you are.", "हम आपको आपके आस-पास की बुकिंग भेजते हैं।") },
        { icon: "wallet", title: t("Paid for every job", "हर काम का भुगतान"), body: t("See what you earn from each completed booking in the app.", "हर पूरी हुई बुकिंग की कमाई ऐप में देखें।") },
        { icon: "phone", title: t("Simple app", "आसान ऐप"), body: t("Log in with your mobile number. No password to remember.", "मोबाइल नंबर से लॉग इन करें। कोई पासवर्ड याद नहीं रखना।") },
        { icon: "shield", title: t("Safe customers", "सुरक्षित ग्राहक"), body: t("Every customer logs in with a verified mobile number and pays before you set out.", "हर ग्राहक वेरिफ़ाइड मोबाइल नंबर से लॉग इन करता है और आपके निकलने से पहले भुगतान करता है।") },
        { icon: "price", title: t("No joining fee", "जुड़ने की कोई फ़ीस नहीं"), body: t("We never charge you to join.", "जुड़ने के लिए हम कभी कोई पैसा नहीं लेते।") },
      ],
    },
    {
      ...base("joinapply", "apply", "soft"),
      type: "proApplication",
      eyebrow: none,
      title: t("Application form", "आवेदन फ़ॉर्म"),
      subtitle: t("Fill it in right here. It takes about 5 minutes.", "यहीं भरें। लगभग 5 मिनट लगते हैं।"),
      stepsTitle: t("How joining works", "जुड़ने का तरीक़ा"),
      steps: [
        { title: t("Apply", "आवेदन करें"), body: t("Fill in the application form with your skills, experience and identity documents.", "आवेदन फ़ॉर्म में अपना हुनर, अनुभव और पहचान के दस्तावेज़ भरें।") },
        {
          title: t("We verify you", "हम आपकी जाँच करते हैं"),
          body: t("Our team checks your documents and work. This usually takes a few working days.", "हमारी टीम आपके दस्तावेज़ और काम जाँचती है। इसमें आम तौर पर कुछ कामकाजी दिन लगते हैं।"),
        },
        {
          title: t("Log in with your mobile number", "मोबाइल नंबर से लॉग इन करें"),
          body: t(
            "Once approved, log in with your mobile number. We send you a code by SMS: no password to remember.",
            "मंज़ूरी मिलने के बाद अपने मोबाइल नंबर से लॉग इन करें। हम SMS से कोड भेजते हैं, कोई पासवर्ड याद नहीं रखना।",
          ),
        },
        {
          title: t("Install the app and go online", "ऐप इंस्टॉल करें और ऑनलाइन हों"),
          body: t(
            "Add the professional app to your phone's home screen, allow alerts and location, and tap Online to start getting jobs.",
            "प्रोफेशनल ऐप को फ़ोन की होम स्क्रीन पर जोड़ें, अलर्ट और लोकेशन की अनुमति दें, और काम पाने के लिए Online दबाएँ।",
          ),
        },
      ],
      note: t("We never charge you to join.", "जुड़ने के लिए हम कभी कोई पैसा नहीं लेते।"),
    },
    {
      ...base("joinfaq", "", "plain"),
      type: "faq",
      eyebrow: none,
      title: t("Questions professionals ask", "प्रोफेशनल अक्सर पूछते हैं"),
      subtitle: none,
      items: [
        { question: t("Do I pay anything to join?", "क्या जुड़ने के लिए कुछ देना होगा?"), answer: t("No. Joining is free.", "नहीं। जुड़ना मुफ़्त है।") },
        {
          question: t("What do I need to apply?", "आवेदन के लिए क्या चाहिए?"),
          answer: t("Your identity documents, the services you can do and your work experience.", "आपके पहचान के दस्तावेज़, आप कौन-सी सेवाएँ कर सकते हैं और आपका काम का अनुभव।"),
        },
        {
          question: t("Can I choose my working hours?", "क्या मैं अपने काम के घंटे ख़ुद चुन सकता/सकती हूँ?"),
          answer: t("Yes. You only get jobs while you are Online in the app.", "हाँ। आपको काम तभी मिलते हैं जब आप ऐप में Online होते हैं।"),
        },
        {
          question: t("Do I need my own products?", "क्या अपने प्रोडक्ट चाहिए?"),
          answer: t("Yes, you bring the products and tools for the services you do.", "हाँ, आप जो सेवाएँ करते हैं उनके प्रोडक्ट और औज़ार आप साथ लाते हैं।"),
        },
      ],
      showContact: true,
    },
  ],
};

/** The first sentence: search results show about that much. */
const firstSentence = (text: string) => text.split(/(?<=[.।])\s/)[0] ?? text;

const legal = (doc: keyof typeof LEGAL_DOCS): PageContent => ({
  title: LEGAL_DOCS[doc].title,
  seo: seo(t(firstSentence(LEGAL_DOCS[doc].intro.en), firstSentence(LEGAL_DOCS[doc].intro.hi))),
  sections: [
    {
      ...base(`legalhead${doc.replace(/[^a-z]/g, "")}`.slice(0, 24), "", "soft"),
      type: "pageHeader",
      eyebrow: LEGAL_DOCS[doc].updated,
      title: LEGAL_DOCS[doc].title,
      subtitle: none,
      image: null,
      primary: noCta,
    },
    {
      ...base(`legalbody${doc.replace(/[^a-z]/g, "")}`.slice(0, 24), "", "plain"),
      type: "richText",
      title: none,
      body: LEGAL_DOCS[doc].body,
      width: "reading",
    },
  ],
});

const FARIDABAD: PageContent = {
  title: t("Salon at home in Faridabad", "फ़रीदाबाद में घर पर सैलून"),
  seo: seo(
    t(
      "Salon, spa and grooming at home in Faridabad. A verified beauty professional at your door in {{min}}–{{max}} minutes, with one clear price.",
      "फ़रीदाबाद में घर पर सैलून, स्पा और ग्रूमिंग। {{min}}–{{max}} मिनट में आपके दरवाज़े पर वेरिफ़ाइड ब्यूटी प्रोफेशनल, एक साफ़ क़ीमत पर।",
    ),
    t("Salon at home in Faridabad", "फ़रीदाबाद में घर पर सैलून"),
  ),
  sections: [
    {
      ...base("cityhero", "", "dark"),
      type: "hero",
      autoplaySeconds: 0,
      showPromise: true,
      height: "medium",
      slides: [
        {
          image: siteImage("city-main"),
          mobileImage: null,
          video: "",
          eyebrow: t("Faridabad", "फ़रीदाबाद"),
          title: t("Salon at home in Faridabad", "फ़रीदाबाद में घर पर सैलून"),
          accent: t("in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में"),
          subtitle: t(
            "Facials, waxing, makeup, massage and men's grooming at your doorstep, by verified professionals.",
            "वेरिफ़ाइड प्रोफेशनल से फ़ेशियल, वैक्सिंग, मेकअप, मसाज और पुरुषों की ग्रूमिंग, आपके दरवाज़े पर।",
          ),
          primary: BOOK,
          secondary: cta(t("How it works", "कैसे काम करता है"), "#how-it-works"),
          align: "left",
        },
      ],
    },
    categories("citycats"),
    popular("citypopular"),
    { ...STEPS, id: "citysteps" },
    { ...FEATURES, id: "cityfeatures", image: siteImage("about-main") },
    {
      ...base("cityareas", "areas", "soft"),
      type: "areas",
      eyebrow: t("Faridabad", "फ़रीदाबाद"),
      title: t("Areas we cover in Faridabad", "फ़रीदाबाद में हमारे इलाक़े"),
      subtitle: t("Allow your location or enter your address at checkout to confirm we reach you.", "पुष्टि के लिए लोकेशन की अनुमति दें या चेकआउट पर पता डालें।"),
      items: [
        t("NIT Faridabad", "एनआईटी फ़रीदाबाद"),
        t("Old Faridabad", "ओल्ड फ़रीदाबाद"),
        t("Sector 15", "सेक्टर 15"),
        t("Sector 16", "सेक्टर 16"),
        t("Sector 21", "सेक्टर 21"),
        t("Sector 28", "सेक्टर 28"),
        t("Sector 31", "सेक्टर 31"),
        t("Sector 37", "सेक्टर 37"),
        t("Sainik Colony", "सैनिक कॉलोनी"),
        t("Surajkund", "सूरजकुंड"),
        t("Greater Faridabad", "ग्रेटर फ़रीदाबाद"),
      ],
      showServed: false,
      body: t(
        "Looking for a salon at home in Faridabad? {{brand}} sends a verified beauty professional to your home in {{min}}–{{max}} minutes. Choose from facials and clean-ups, full-body waxing, threading, manicure and pedicure, hair styling, party and bridal makeup, relaxing body massage and men's haircut, beard and skincare.\n\n## Why book a salon at home\n\n- No travel or waiting: the professional brings products, tools and disposable sheets.\n- One clear price with taxes included, paid online before the visit.\n- The service starts only when you share your 4-digit OTP.\n- If no one is free, your money comes back automatically.",
        "क्या आप फ़रीदाबाद में घर पर सैलून ढूँढ रहे हैं? {{brand}} {{min}}–{{max}} मिनट में आपके घर वेरिफ़ाइड ब्यूटी प्रोफेशनल भेजता है। फ़ेशियल और क्लीन-अप, फ़ुल-बॉडी वैक्सिंग, थ्रेडिंग, मैनीक्योर-पेडीक्योर, हेयर स्टाइलिंग, पार्टी और ब्राइडल मेकअप, आरामदायक बॉडी मसाज और पुरुषों के हेयरकट, दाढ़ी और स्किनकेयर में से चुनें।\n\n## घर पर सैलून क्यों बुक करें\n\n- न आने-जाने की झंझट, न इंतज़ार: प्रोफेशनल प्रोडक्ट, औज़ार और डिस्पोज़ेबल शीट साथ लाते हैं।\n- टैक्स सहित एक साफ़ क़ीमत, जो विज़िट से पहले ऑनलाइन चुकाई जाती है।\n- सेवा तभी शुरू होती है जब आप अपना 4 अंकों का OTP बताते हैं।\n- अगर कोई खाली न हो, तो पैसा अपने आप वापस।",
      ),
    },
    { ...TESTIMONIALS, id: "cityreviews", tone: "plain" },
    {
      ...base("cityfaq", "faq", "soft"),
      type: "faq",
      eyebrow: none,
      title: t("Salon at home in Faridabad: questions", "फ़रीदाबाद में घर पर सैलून: सवाल"),
      subtitle: none,
      items: FAQ_ITEMS,
      showContact: true,
    },
    { ...READY, id: "cityready" },
  ],
};

/** Path → default content. `locked` pages are linked from the app itself and can't be removed or moved. */
export const DEFAULT_PAGES: ReadonlyArray<{ path: string; locked: boolean; content: PageContent }> = [
  { path: "/", locked: true, content: HOME },
  { path: "/about", locked: true, content: ABOUT },
  { path: "/contact", locked: true, content: CONTACT },
  { path: "/register-as-professional", locked: true, content: JOIN },
  { path: "/legal/privacy", locked: true, content: legal("privacy") },
  { path: "/legal/terms", locked: true, content: legal("terms") },
  { path: "/legal/cancellation-refund", locked: true, content: legal("cancellation-refund") },
  { path: "/faridabad-at-home-services", locked: false, content: FARIDABAD },
];

export const defaultPage = (path: string) => DEFAULT_PAGES.find((page) => page.path === path);
