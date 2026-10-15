import type { SiteConfig } from "./site";
import { siteImage } from "./siteImages";

const t = (en: string, hi: string) => ({ en, hi });

/**
 * The website as it ships, before an admin changes anything. The web app shows this until
 * /v1/site answers, so the first paint already has the right menu, colour and footer.
 */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brand: {
    name: t("Ghar Ghar Salon Express", "घर घर सैलून एक्सप्रेस"),
    tagline: t("Salon, spa and grooming at home in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में घर पर सैलून, स्पा और ग्रूमिंग"),
    logo: null,
    showName: true,
    supportPhone: "+91 70650 94179",
    whatsapp: "",
    supportEmail: "teamhr@ghargharsalonexpress.com",
    address: t("", ""),
    legalName: "",
    gstin: "",
    grievanceOfficer: "",
    jurisdiction: "",
    promiseMin: 10,
    promiseMax: 15,
  },
  theme: { accent: "#F26522", headingFont: "poppins", bodyFont: "noto-sans", corners: "rounded" },
  header: {
    menu: [
      { label: t("Services", "सेवाएँ"), href: "/services", emphasis: false },
      { label: t("How it works", "कैसे काम करता है"), href: "/#how-it-works", emphasis: false },
      { label: t("About", "हमारे बारे में"), href: "/about", emphasis: false },
      { label: t("Contact", "संपर्क करें"), href: "/contact", emphasis: false },
      { label: t("Register as a Professional", "प्रोफेशनल बनें"), href: "/register-as-professional", emphasis: true },
    ],
    announcement: {
      enabled: true,
      text: t("A verified professional at your door in {{min}}–{{max}} minutes. Open every day, {{open}} – {{close}}.", "{{min}}–{{max}} मिनट में आपके दरवाज़े पर वेरिफ़ाइड प्रोफेशनल। रोज़ खुला, {{open}} – {{close}}।"),
      href: "/services",
    },
  },
  footer: {
    about: t(
      "Salon, spa and grooming at home, done by verified professionals who reach you in {{min}}–{{max}} minutes. One clear price with taxes included, and nothing extra at your door.",
      "घर पर सैलून, स्पा और ग्रूमिंग, वेरिफ़ाइड प्रोफेशनल के हाथों जो {{min}}–{{max}} मिनट में आप तक पहुँचते हैं। टैक्स सहित एक साफ़ क़ीमत, दरवाज़े पर कुछ अतिरिक्त नहीं।",
    ),
    columns: [
      {
        title: t("Services", "सेवाएँ"),
        links: [
          { label: t("Salon for women", "महिलाओं का सैलून"), href: "/services?category=salon-for-women" },
          { label: t("Makeup and styling", "मेकअप और स्टाइलिंग"), href: "/services?category=makeup-and-styling" },
          { label: t("Spa for women", "महिलाओं के लिए स्पा"), href: "/services?category=spa-for-women" },
          { label: t("Men's grooming", "पुरुषों की ग्रूमिंग"), href: "/services?gender=men" },
          { label: t("Salon at home in Faridabad", "फ़रीदाबाद में घर पर सैलून"), href: "/faridabad-at-home-services" },
        ],
      },
      {
        title: t("Company", "कंपनी"),
        links: [
          { label: t("About us", "हमारे बारे में"), href: "/about" },
          { label: t("Contact us", "संपर्क करें"), href: "/contact" },
          { label: t("Join as a professional", "प्रोफेशनल के रूप में जुड़ें"), href: "/register-as-professional" },
        ],
      },
      {
        title: t("Help", "मदद"),
        links: [
          { label: t("How it works", "कैसे काम करता है"), href: "/#how-it-works" },
          { label: t("Questions people ask", "अक्सर पूछे जाने वाले सवाल"), href: "/#faq" },
          { label: t("Cancellation and refunds", "रद्द करना और रिफ़ंड"), href: "/legal/cancellation-refund" },
        ],
      },
      {
        title: t("Legal", "क़ानूनी"),
        links: [
          { label: t("Privacy policy", "प्राइवेसी पॉलिसी"), href: "/legal/privacy" },
          { label: t("Terms of service", "सेवा की शर्तें"), href: "/legal/terms" },
        ],
      },
    ],
    bottomText: t("All prices include taxes.", "सभी क़ीमतों में टैक्स शामिल है।"),
  },
  social: { instagram: "", facebook: "", youtube: "", x: "", linkedin: "" },
  apps: { android: "", ios: "" },
  // The application form the client approved; admins can point it elsewhere.
  proFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdXVGS7R7BTjZoJqX9EzDpOqir-Vfp6w2IdK5en-AX-VN6zBg/viewform",
  photos: { login: siteImage("login-side"), notFound: siteImage("not-found") },
  seo: {
    titleTemplate: "%s · Ghar Ghar Salon Express",
    description: t(
      "Book a verified beauty professional to your door in {{min}}–{{max}} minutes. Salon, spa and grooming at home with one clear price.",
      "{{min}}–{{max}} मिनट में वेरिफ़ाइड ब्यूटी प्रोफेशनल को घर बुलाएँ। एक साफ़ क़ीमत पर घर पर सैलून, स्पा और ग्रूमिंग।",
    ),
    image: null,
  },
  location: {
    askOnArrival: true,
    notServedMessage: t(
      "We don't serve your area yet. Leave your number and we'll message you the day we start there.",
      "हम अभी आपके इलाक़े में सेवा नहीं देते। अपना नंबर छोड़ें, जिस दिन वहाँ शुरू करेंगे हम आपको बता देंगे।",
    ),
  },
};
