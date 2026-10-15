import type { FieldSpec } from "./sectionSpecs";

// The site-wide settings, grouped the way Admin → Website shows them (ADR-0021). Brand & theme
// also has the colour and font editor (SiteSettingsPage); everything else is listed here.

export type SettingsArea = "brand" | "menus" | "seo";

export interface SettingsGroup {
  title: string;
  description?: string;
  fields: FieldSpec[];
}

const link = (name: string, label: string): FieldSpec => ({ kind: "plain", name, label, hint: "The full https:// address. Leave empty to hide." });

export const AREA_GROUPS: Record<SettingsArea, SettingsGroup[]> = {
  brand: [
    {
      title: "Name and logo",
      fields: [
        { kind: "text", name: "brand.name", label: "Business name" },
        { kind: "text", name: "brand.tagline", label: "Tagline", hint: "One line about what you do. {{min}}–{{max}} shows the arrival time." },
        { kind: "image", name: "brand.logo", label: "Logo", hint: "PNG or JPG, square or wide. Leave empty to use the gold emblem that ships with the site." },
        { kind: "switch", name: "brand.showName", label: "Show the name beside the logo", hint: "Turn off if your logo already contains the name." },
      ],
    },
    {
      title: "Contact details",
      description: "Shown in the header, footer, contact page and policies.",
      fields: [
        { kind: "plain", name: "brand.supportPhone", label: "Phone number", hint: "As people should see it, e.g. +91 70650 94179." },
        { kind: "plain", name: "brand.whatsapp", label: "WhatsApp number", hint: "With country code, e.g. +91 70650 94179. Leave empty to hide WhatsApp buttons." },
        { kind: "plain", name: "brand.supportEmail", label: "Email address" },
        { kind: "text", name: "brand.address", label: "Address", multiline: true, rows: 2 },
      ],
    },
    {
      title: "Arrival promise",
      description: "The minutes quoted across the site wherever {{min}} and {{max}} appear.",
      fields: [
        { kind: "number", name: "brand.promiseMin", label: "From", suffix: "minutes" },
        { kind: "number", name: "brand.promiseMax", label: "To", suffix: "minutes" },
      ],
    },
    {
      title: "Other photos",
      description: "Photos outside the pages you build.",
      fields: [
        { kind: "image", name: "photos.login", label: "Beside the login form", hint: "Shown on computers. A tall photo works best." },
        { kind: "image", name: "photos.notFound", label: "On “Page not found”" },
      ],
    },
    {
      title: "Legal details",
      description: "Used by the privacy policy, terms and footer ({{company}}, {{gstin}}, {{grievance}}, {{city}}).",
      fields: [
        { kind: "plain", name: "brand.legalName", label: "Registered company name", hint: "e.g. Ghar Ghar Salon Express Private Limited." },
        { kind: "plain", name: "brand.gstin", label: "GSTIN", hint: "15 characters. Shown in the footer." },
        { kind: "plain", name: "brand.grievanceOfficer", label: "Grievance Officer", hint: "Name, and an email or phone if different from support." },
        { kind: "plain", name: "brand.jurisdiction", label: "City for legal disputes", hint: "The courts named in the terms, e.g. Faridabad, Haryana." },
      ],
    },
  ],
  menus: [
    {
      title: "Header menu",
      description: "The links at the top of every page. On phones they open from the menu button.",
      fields: [
        {
          kind: "list",
          name: "header.menu",
          label: "Menu items",
          itemLabel: "Item",
          max: 8,
          create: () => ({ label: { en: "New link", hi: "" }, href: "/", emphasis: false }),
          fields: [
            { kind: "text", name: "label", label: "Text" },
            { kind: "link", name: "href", label: "Opens" },
            { kind: "switch", name: "emphasis", label: "Show as an outlined button" },
          ],
        },
      ],
    },
    {
      title: "Announcement bar",
      description: "The thin dark bar above the header.",
      fields: [
        { kind: "switch", name: "header.announcement.enabled", label: "Show the announcement" },
        { kind: "text", name: "header.announcement.text", label: "Message", hint: "Keep it short: about 90 characters fit on a phone." },
        { kind: "link", name: "header.announcement.href", label: "Opens" },
      ],
    },
    {
      title: "Footer",
      fields: [
        { kind: "text", name: "footer.about", label: "About text", multiline: true, rows: 3 },
        {
          kind: "list",
          name: "footer.columns",
          label: "Link columns",
          itemLabel: "Column",
          max: 4,
          create: () => ({ title: { en: "New column", hi: "" }, links: [{ label: { en: "New link", hi: "" }, href: "/" }] }),
          fields: [
            { kind: "text", name: "title", label: "Column title" },
            {
              kind: "list",
              name: "links",
              label: "Links",
              itemLabel: "Link",
              min: 1,
              max: 10,
              create: () => ({ label: { en: "New link", hi: "" }, href: "/" }),
              fields: [
                { kind: "text", name: "label", label: "Text" },
                { kind: "link", name: "href", label: "Opens" },
              ],
            },
          ],
        },
        { kind: "text", name: "footer.bottomText", label: "Line at the very bottom", hint: "Beside the © line, e.g. “All prices include taxes.”" },
      ],
    },
    {
      title: "Social media",
      description: "Icons in the footer. Empty ones are hidden.",
      fields: [link("social.instagram", "Instagram"), link("social.facebook", "Facebook"), link("social.youtube", "YouTube"), link("social.x", "X (Twitter)"), link("social.linkedin", "LinkedIn")],
    },
    {
      title: "Apps",
      description: "Store buttons in the footer and in “App download” sections. Empty ones are hidden.",
      fields: [link("apps.android", "Google Play link"), link("apps.ios", "App Store link")],
    },
    {
      title: "Professional application form",
      description: "The form on the “Join as a professional” page. A Google Form shows inside the page.",
      fields: [{ kind: "plain", name: "proFormUrl", label: "Form link", hint: "The form's https:// address. Without one, applications are sent by email to the support address." }],
    },
  ],
  seo: [
    {
      title: "Search engines and link previews",
      description: "Defaults for every page; each page can set its own in the page editor.",
      fields: [
        { kind: "plain", name: "seo.titleTemplate", label: "Title pattern", hint: "%s is replaced by the page title, e.g. “%s · Ghar Ghar Salon Express”." },
        { kind: "text", name: "seo.description", label: "Description", multiline: true, rows: 3, hint: "About 150 characters. Shown under the title in search results." },
        { kind: "image", name: "seo.image", label: "Preview photo", hint: "Shown when a page is shared, if the page has no photo of its own. Wide, at least 1200 px." },
      ],
    },
    {
      title: "Location",
      description: "Visitors are asked for their location as soon as they open the site, and told whether you serve them.",
      fields: [
        { kind: "switch", name: "location.askOnArrival", label: "Ask for the location when someone opens the site" },
        { kind: "text", name: "location.notServedMessage", label: "Message when you don't serve their area", multiline: true, rows: 2 },
      ],
    },
  ],
};
