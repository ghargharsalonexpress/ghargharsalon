import type { SECTION_TONES } from "@brand/shared";
import { FEATURE_ICONS, type Localized, type Section, type SectionType } from "@brand/shared";

// What the page builder shows for each section type (ADR-0021): its name, what it is for,
// its fields and the content a new one starts with. The admin reads in English (plan A3),
// so these labels live here beside the fields they describe.

export type FieldSpec =
  | { kind: "text"; name: string; label: string; hint?: string; multiline?: boolean; rows?: number; markdown?: boolean }
  | { kind: "plain"; name: string; label: string; hint?: string }
  | { kind: "link"; name: string; label: string; hint?: string }
  | { kind: "cta"; name: string; label: string; hint?: string }
  | { kind: "image"; name: string; label: string; hint?: string }
  | { kind: "video"; name: string; label: string; hint?: string }
  | { kind: "select"; name: string; label: string; hint?: string; numeric?: boolean; options: ReadonlyArray<{ value: string; label: string }> }
  | { kind: "number"; name: string; label: string; hint?: string; suffix?: string }
  | { kind: "switch"; name: string; label: string; hint?: string }
  | { kind: "icon"; name: string; label: string }
  | { kind: "services"; name: string; label: string; hint?: string }
  | { kind: "textList"; name: string; label: string; itemLabel: string; max: number; hint?: string }
  | { kind: "list"; name: string; label: string; itemLabel: string; max: number; min?: number; fields: FieldSpec[]; create: () => unknown; hint?: string };

/** Text in both languages. */
const loc = (en = "", hi = ""): Localized => ({ en, hi });
const noCta = () => ({ label: loc(), href: "" });

/** A new section id: lowercase letters and digits (the API checks the format). */
export const newSectionId = (): string => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) => alphabet[byte % alphabet.length]).join("");
};

const base = () => ({ id: newSectionId(), visible: true, anchor: "", tone: "plain" as const });

const heading: FieldSpec[] = [
  { kind: "text", name: "eyebrow", label: "Small label above the title", hint: "Optional. Short, e.g. “Why us”." },
  { kind: "text", name: "title", label: "Title" },
  { kind: "text", name: "subtitle", label: "Text under the title", multiline: true, rows: 2 },
];

export const TONE_OPTIONS: ReadonlyArray<{ value: (typeof SECTION_TONES)[number]; label: string }> = [
  { value: "plain", label: "White" },
  { value: "soft", label: "Soft grey" },
  { value: "accent", label: "Brand colour tint" },
  { value: "dark", label: "Dark" },
];

export const ICON_OPTIONS = FEATURE_ICONS.map((icon) => ({ value: icon, label: icon.charAt(0).toUpperCase() + icon.slice(1) }));

export interface SectionInfo {
  label: string;
  description: string;
  fields: FieldSpec[];
  /** The text that names a section in the list (its title, or the first slide's). */
  summary: (section: Section) => string;
  create: () => Section;
}

const titleOf = (section: Section): string => ("title" in section && section.title && typeof section.title === "object" && "en" in section.title ? section.title.en : "");

export const SECTION_INFO: Record<SectionType, SectionInfo> = {
  hero: {
    label: "Banner slider",
    description: "Big photos or a video with your main message and buttons. Put it first on the page.",
    fields: [
      {
        kind: "list",
        name: "slides",
        label: "Slides",
        itemLabel: "Slide",
        min: 1,
        max: 6,
        hint: "Several slides change on their own; visitors can also swipe.",
        create: () => ({ image: null, mobileImage: null, video: "", eyebrow: loc(), title: loc("New slide"), accent: loc(), subtitle: loc(), primary: { label: loc("Book now", "अभी बुक करें"), href: "/services" }, secondary: noCta(), align: "left" }),
        fields: [
          { kind: "image", name: "image", label: "Photo", hint: "Wide photo, at least 1600 px across." },
          { kind: "image", name: "mobileImage", label: "Photo for phones (optional)", hint: "A taller photo for small screens. The main photo is used when empty." },
          { kind: "video", name: "video", label: "Video (optional)", hint: "Plays over the photo on computers; phones show the photo." },
          { kind: "text", name: "eyebrow", label: "Small label above the title" },
          { kind: "text", name: "title", label: "Title" },
          { kind: "text", name: "accent", label: "Highlighted words", hint: "Shown in a coloured box on the next line, e.g. “in {{min}}–{{max}} minutes”." },
          { kind: "text", name: "subtitle", label: "Text under the title", multiline: true, rows: 2 },
          { kind: "cta", name: "primary", label: "Main button" },
          { kind: "cta", name: "secondary", label: "Second button" },
          { kind: "select", name: "align", label: "Text position", options: [{ value: "left", label: "Left" }, { value: "center", label: "Centre" }] },
        ],
      },
      { kind: "number", name: "autoplaySeconds", label: "Change slide every", suffix: "seconds", hint: "0 keeps the first slide until someone swipes." },
      { kind: "switch", name: "showPromise", label: "Show the arrival time and opening hours under the buttons" },
      { kind: "select", name: "height", label: "Height", options: [{ value: "full", label: "Full screen" }, { value: "large", label: "Large" }, { value: "medium", label: "Medium" }] },
    ],
    summary: (section) => (section.type === "hero" ? (section.slides[0]?.title.en ?? "") : ""),
    create: () => ({
      ...base(),
      tone: "dark",
      type: "hero",
      autoplaySeconds: 6,
      showPromise: true,
      height: "large",
      slides: [{ image: null, mobileImage: null, video: "", eyebrow: loc(), title: loc("Salon at home", "घर पर सैलून"), accent: loc("in {{min}}–{{max}} minutes", "{{min}}–{{max}} मिनट में"), subtitle: loc(), primary: { label: loc("Book now", "अभी बुक करें"), href: "/services" }, secondary: noCta(), align: "left" }],
    }),
  },
  pageHeader: {
    label: "Page header",
    description: "The title of an inner page, with a line about it and an optional photo.",
    fields: [...heading, { kind: "image", name: "image", label: "Photo (optional)" }, { kind: "cta", name: "primary", label: "Button (optional)" }],
    summary: titleOf,
    create: () => ({ ...base(), tone: "soft", type: "pageHeader", eyebrow: loc(), title: loc("Page title"), subtitle: loc(), image: null, primary: noCta() }),
  },
  categories: {
    label: "Categories",
    description: "Your service categories from the catalogue, with photos and starting prices.",
    fields: [
      ...heading,
      {
        kind: "select",
        name: "layout",
        label: "Show",
        options: [
          { value: "tabs", label: "Women and men, with a switch" },
          { value: "split", label: "Women and men side by side" },
          { value: "women", label: "Women only" },
          { value: "men", label: "Men only" },
        ],
      },
      { kind: "select", name: "style", label: "Card style", options: [{ value: "cards", label: "Photo cards" }, { value: "circles", label: "Round photos" }, { value: "posters", label: "Tall posters (slider)" }] },
      { kind: "switch", name: "showPrices", label: "Show starting prices" },
      { kind: "cta", name: "cta", label: "Button under the categories (optional)" },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "categories", eyebrow: loc(), title: loc("What would you like today?", "आज आप क्या करवाना चाहेंगे?"), subtitle: loc(), layout: "tabs", style: "cards", showPrices: true, cta: noCta() }),
  },
  services: {
    label: "Services row",
    description: "Service cards with prices and an Add button: chosen by you, or picked automatically.",
    fields: [
      ...heading,
      { kind: "select", name: "mode", label: "Which services", options: [{ value: "auto", label: "Pick automatically (a mix of categories)" }, { value: "picked", label: "The ones I choose below" }] },
      { kind: "select", name: "gender", label: "For", options: [{ value: "all", label: "Everyone" }, { value: "women", label: "Women" }, { value: "men", label: "Men" }] },
      { kind: "services", name: "slugs", label: "Services to show", hint: "Used when “The ones I choose below” is selected. Shown in this order." },
      { kind: "number", name: "limit", label: "How many", suffix: "services" },
      { kind: "cta", name: "cta", label: "Button beside the title (optional)" },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "services", eyebrow: loc(), title: loc("Popular services", "लोकप्रिय सेवाएँ"), subtitle: loc(), mode: "auto", gender: "all", slugs: [], limit: 8, cta: { label: loc("View all services", "सभी सेवाएँ देखें"), href: "/services" } }),
  },
  offers: {
    label: "Offer banners",
    description: "Promotion cards with a photo, a badge and a button.",
    fields: [
      ...heading,
      {
        kind: "list",
        name: "items",
        label: "Banners",
        itemLabel: "Banner",
        min: 1,
        max: 8,
        create: () => ({ image: null, badge: loc(), title: loc("New offer"), subtitle: loc(), cta: noCta() }),
        fields: [
          { kind: "image", name: "image", label: "Photo" },
          { kind: "text", name: "badge", label: "Badge", hint: "e.g. “New”, “20% off”." },
          { kind: "text", name: "title", label: "Title" },
          { kind: "text", name: "subtitle", label: "Text", multiline: true, rows: 2 },
          { kind: "cta", name: "cta", label: "Button" },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "offers", eyebrow: loc(), title: loc("Offers", "ऑफ़र"), subtitle: loc(), items: [{ image: null, badge: loc(), title: loc("New offer"), subtitle: loc(), cta: noCta() }] }),
  },
  steps: {
    label: "Steps",
    description: "Numbered steps with photos, like “How it works”.",
    fields: [
      ...heading,
      {
        kind: "list",
        name: "items",
        label: "Steps",
        itemLabel: "Step",
        min: 1,
        max: 6,
        create: () => ({ image: null, title: loc("New step"), body: loc() }),
        fields: [
          { kind: "image", name: "image", label: "Photo (optional)" },
          { kind: "text", name: "title", label: "Title" },
          { kind: "text", name: "body", label: "Text", multiline: true, rows: 2 },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), tone: "soft", type: "steps", eyebrow: loc(), title: loc("How it works", "कैसे काम करता है"), subtitle: loc(), items: [{ image: null, title: loc("Choose and pay"), body: loc() }] }),
  },
  stats: {
    label: "Numbers",
    description: "Big numbers with icons, e.g. arrival time or number of services. Keep them true.",
    fields: [
      ...heading,
      {
        kind: "list",
        name: "items",
        label: "Numbers",
        itemLabel: "Number",
        min: 1,
        max: 6,
        create: () => ({ icon: "star", value: loc("1"), label: loc("Label") }),
        fields: [
          { kind: "icon", name: "icon", label: "Icon" },
          { kind: "text", name: "value", label: "Number or short value", hint: "e.g. “{{min}}–{{max}} min” or “{{services}}+”." },
          { kind: "text", name: "label", label: "What it means" },
        ],
      },
    ],
    summary: (section) => (section.type === "stats" ? section.items.map((item) => item.value.en).join(" · ") : ""),
    create: () => ({ ...base(), type: "stats", eyebrow: loc(), title: loc(), subtitle: loc(), items: [{ icon: "clock", value: loc("{{min}}–{{max}} min", "{{min}}–{{max}} मिनट"), label: loc("A professional at your door", "आपके दरवाज़े पर प्रोफेशनल") }] }),
  },
  features: {
    label: "Features",
    description: "Reasons to choose you, each with an icon. A photo can sit beside them.",
    fields: [
      ...heading,
      { kind: "image", name: "image", label: "Photo beside the list (optional)" },
      {
        kind: "list",
        name: "items",
        label: "Features",
        itemLabel: "Feature",
        min: 1,
        max: 9,
        create: () => ({ icon: "verified", title: loc("New feature"), body: loc() }),
        fields: [
          { kind: "icon", name: "icon", label: "Icon" },
          { kind: "text", name: "title", label: "Title" },
          { kind: "text", name: "body", label: "Text", multiline: true, rows: 2 },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "features", eyebrow: loc(), title: loc("Why people book with us", "लोग हमें क्यों चुनते हैं"), subtitle: loc(), image: null, items: [{ icon: "verified", title: loc("Verified professionals", "वेरिफ़ाइड प्रोफेशनल"), body: loc() }] }),
  },
  testimonials: {
    label: "Reviews",
    description: "Real ratings customers left after a booking (4★ and up, with a comment), and any you add. Hidden while there are none.",
    fields: [
      ...heading,
      {
        kind: "select",
        name: "source",
        label: "Show",
        options: [
          { value: "reviews", label: "Customers' real reviews" },
          { value: "written", label: "Only the ones I add below" },
          { value: "both", label: "Both" },
        ],
      },
      {
        kind: "list",
        name: "items",
        label: "Reviews you add",
        itemLabel: "Review",
        max: 12,
        hint: "Only add reviews customers really gave you (for example on Google), with their permission.",
        create: () => ({ name: "", place: loc(), rating: 5, quote: loc(), photo: null }),
        fields: [
          { kind: "plain", name: "name", label: "Customer's name", hint: "First name and initial, e.g. “Priya S.”" },
          { kind: "text", name: "place", label: "Area or service" },
          { kind: "select", name: "rating", label: "Stars", numeric: true, options: [5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: "★".repeat(value) })) },
          { kind: "text", name: "quote", label: "What they said", multiline: true, rows: 3 },
          { kind: "image", name: "photo", label: "Photo (optional, with permission)" },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), tone: "soft", type: "testimonials", eyebrow: loc(), title: loc("Loved by our customers", "हमारे ग्राहकों की पसंद"), subtitle: loc(), source: "reviews", items: [] }),
  },
  faq: {
    label: "Questions (FAQ)",
    description: "Questions and answers that open on tap. Search engines show them too.",
    fields: [
      ...heading,
      { kind: "switch", name: "showContact", label: "Show “Didn't find your answer? Write to us”" },
      {
        kind: "list",
        name: "items",
        label: "Questions",
        itemLabel: "Question",
        min: 1,
        max: 20,
        create: () => ({ question: loc("New question"), answer: loc("Answer") }),
        fields: [
          { kind: "text", name: "question", label: "Question" },
          { kind: "text", name: "answer", label: "Answer", multiline: true, rows: 3 },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "faq", eyebrow: loc(), title: loc("Questions people ask", "लोग अक्सर पूछते हैं"), subtitle: loc(), showContact: true, items: [{ question: loc("New question"), answer: loc("Answer") }] }),
  },
  imageText: {
    label: "Photo and text",
    description: "A photo beside a block of text, with an optional button.",
    fields: [
      ...heading,
      { kind: "text", name: "body", label: "Text", multiline: true, rows: 6, markdown: true },
      { kind: "image", name: "image", label: "Photo" },
      { kind: "select", name: "imageSide", label: "Photo on the", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
      { kind: "cta", name: "cta", label: "Button (optional)" },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "imageText", eyebrow: loc(), title: loc("New section"), subtitle: loc(), body: loc(), image: null, imageSide: "left", cta: noCta() }),
  },
  richText: {
    label: "Text",
    description: "Free text with headings, lists and links: policies, long descriptions.",
    fields: [
      { kind: "text", name: "title", label: "Title (optional)" },
      { kind: "text", name: "body", label: "Text", multiline: true, rows: 14, markdown: true },
      { kind: "select", name: "width", label: "Width", options: [{ value: "reading", label: "Narrow (easy reading)" }, { value: "wide", label: "Wide" }] },
    ],
    summary: (section) => titleOf(section) || (section.type === "richText" ? section.body.en.replace(/[#>*\-[\]()]/g, "").trim().slice(0, 60) : ""),
    create: () => ({ ...base(), type: "richText", title: loc(), body: loc("Write here."), width: "reading" }),
  },
  gallery: {
    label: "Photo gallery",
    description: "A mosaic of photos with optional captions.",
    fields: [
      ...heading,
      {
        kind: "list",
        name: "items",
        label: "Photos",
        itemLabel: "Photo",
        min: 1,
        max: 24,
        create: () => ({ image: null, caption: loc() }),
        fields: [
          { kind: "image", name: "image", label: "Photo" },
          { kind: "text", name: "caption", label: "Caption (optional)" },
        ],
      },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "gallery", eyebrow: loc(), title: loc("Our work", "हमारा काम"), subtitle: loc(), items: [] }),
  },
  video: {
    label: "Video",
    description: "A YouTube video (it loads only when played) or a video file.",
    fields: [...heading, { kind: "plain", name: "youtube", label: "YouTube link", hint: "Paste the video's link." }, { kind: "video", name: "file", label: "Or your own video", hint: "Used when there is no YouTube link." }, { kind: "image", name: "poster", label: "Cover photo (optional)" }],
    summary: titleOf,
    create: () => ({ ...base(), type: "video", eyebrow: loc(), title: loc("Watch how it works"), subtitle: loc(), youtube: "", file: "/video/hero.mp4", poster: null }),
  },
  cta: {
    label: "Call to action",
    description: "A closing banner with a message and buttons, over a photo or your brand colour.",
    fields: [...heading, { kind: "image", name: "image", label: "Background photo (optional)" }, { kind: "cta", name: "primary", label: "Main button" }, { kind: "cta", name: "secondary", label: "Second button" }],
    summary: titleOf,
    create: () => ({ ...base(), type: "cta", eyebrow: loc(), title: loc("Ready when you are", "जब आप तैयार हों"), subtitle: loc(), image: null, primary: { label: loc("Book now", "अभी बुक करें"), href: "/services" }, secondary: noCta() }),
  },
  appDownload: {
    label: "App download",
    description: "Store buttons for your apps. Shown only once Brand & theme has an app link.",
    fields: [...heading, { kind: "image", name: "image", label: "Photo (optional)" }],
    summary: titleOf,
    create: () => ({ ...base(), type: "appDownload", eyebrow: loc(), title: loc("Get the app", "ऐप पाएँ"), subtitle: loc(), image: null }),
  },
  areas: {
    label: "Areas we serve",
    description: "Localities as tags beside a description. Good for city pages and search engines.",
    fields: [
      ...heading,
      { kind: "text", name: "body", label: "Description", multiline: true, rows: 6, markdown: true },
      { kind: "textList", name: "items", label: "Localities", itemLabel: "Locality", max: 80 },
      { kind: "switch", name: "showServed", label: "Also list the areas from Settings → Areas" },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "areas", eyebrow: loc(), title: loc("Areas we serve", "हमारे इलाक़े"), subtitle: loc(), items: [], showServed: true, body: loc() }),
  },
  contactForm: {
    label: "Contact form",
    description: "The contact form (messages arrive in Admin → Messages) beside your phone, email and hours.",
    fields: [...heading, { kind: "switch", name: "showDetails", label: "Show phone, WhatsApp, email, hours and address beside the form" }],
    summary: titleOf,
    create: () => ({ ...base(), type: "contactForm", eyebrow: loc(), title: loc("Write to us", "हमें लिखें"), subtitle: loc(), showDetails: true }),
  },
  proApplication: {
    label: "Professional application",
    description: "The application form for professionals (the link is in Brand & theme) with the joining steps.",
    fields: [
      ...heading,
      { kind: "text", name: "stepsTitle", label: "Title of the steps box" },
      {
        kind: "list",
        name: "steps",
        label: "Steps",
        itemLabel: "Step",
        max: 6,
        create: () => ({ title: loc("New step"), body: loc() }),
        fields: [
          { kind: "text", name: "title", label: "Title" },
          { kind: "text", name: "body", label: "Text", multiline: true, rows: 2 },
        ],
      },
      { kind: "text", name: "note", label: "Note under the form" },
    ],
    summary: titleOf,
    create: () => ({ ...base(), type: "proApplication", eyebrow: loc(), title: loc("Application form", "आवेदन फ़ॉर्म"), subtitle: loc(), stepsTitle: loc("How joining works", "जुड़ने का तरीक़ा"), steps: [], note: loc() }),
  },
  joinPros: {
    label: "Invite professionals",
    description: "Asks beauty professionals to join, with a photo and a short checklist.",
    fields: [...heading, { kind: "image", name: "image", label: "Photo" }, { kind: "textList", name: "points", label: "Checklist", itemLabel: "Point", max: 6 }, { kind: "cta", name: "cta", label: "Button" }],
    summary: titleOf,
    create: () => ({
      ...base(),
      tone: "accent",
      type: "joinPros",
      eyebrow: loc(),
      title: loc("Are you a beauty professional?", "क्या आप ब्यूटी प्रोफेशनल हैं?"),
      subtitle: loc(),
      image: null,
      points: [],
      cta: { label: loc("Register as a Professional", "प्रोफेशनल के रूप में जुड़ें"), href: "/register-as-professional" },
    }),
  },
};
