# ADR-0021: The website is built in the admin (page builder, theme, location on arrival)
- Status: Accepted
- Date: 2026-10-16

## Context
- **What the client asked for:**
  - A premium website like billu.co.in and yesmadam.com/faridabad-at-home-services.
  - Photos on every page, and no blank, dummy or half-finished sections.
  - Everything changeable from the admin, so that nothing ever needs a developer: content, photos, pages, menus, sections, colours, fonts, banners and SEO.
  - The browser's location question as soon as someone opens the site, as billu does.
- **What existed:**
  - Only the catalogue and the operations settings were editable.
  - Home, About, Contact, Join and the policies were React components with their text in the locale files.
  - The menus were in code.
  - The colour was compiled into the bundle.
  - 184 of 194 services had no photo, and the policies showed "[Company legal name]".

## Decision
- **One site configuration document** (`site`, versioned with history and audit like the settings):
  - Brand: name, tagline, logo, contacts and legal details.
  - Theme: one accent colour, two fonts from a curated list, a corner style.
  - Header menu and announcement bar; footer columns.
  - Social and app links, and the professionals' form.
  - SEO defaults.
  - The login and 404 photos.
  - Location: whether to ask on arrival, and the not-served message.
  - It is kept out of `settings` on purpose: operations rules and website looks change for different reasons and at different speeds.
- **Pages are documents of ordered sections:**
  - There are 20 section types, each a zod schema in `packages/shared/src/site.ts`: banner slider, page header, categories, services row, offers, steps, numbers, features, reviews, FAQ, photo + text, text, gallery, video, call to action, app download, areas, contact form, professional application and invite professionals.
  - Each page keeps a draft (`content`) and a published copy. Publishing keeps the last 20 published versions, and any of them can be restored.
  - An admin's `?preview=1` shows the draft.
  - The pages the app links to (home, contact, join, policies, about) are locked: they can't be deleted or moved.
  - Every other address the public router doesn't know is looked up as a page, or shows the 404.
- **Shipped content:**
  - The default pages live in `apps/api/src/modules/site/defaultPages.ts`. A fresh database serves them as they are, and the admin list creates them once.
  - A deleted default page stays deleted. "Reset to default" brings a page's shipped content back into its draft.
  - Texts take `{{variables}}`, so fees, hours, contacts and the arrival promise are never copied into content. Examples: `{{min}}`, `{{cancelFee}}`, `{{phone}}`, `{{company}}`.
  - Legal details the admin hasn't filled in read as neutral wording, never as a bracketed placeholder.
- **Default photos:**
  - There are 32 free-licence photos (Unsplash and Pexels licences). Credits are in `scripts/images/site/LICENSES.md`.
  - They ship with the web app as WebP sizes (`public/images/site`, built by `scripts/images/site.mjs`) and are referenced by keys starting with `images/`. They work without seeding or a CDN.
  - Every one of them can be replaced by an upload (`/v1/admin/media?folder=site`).
  - A service without a photo shows its category's, and a category without one shows its default photo.
- **The theme is built at runtime:**
  - The admin's colour becomes a full ramp. The hand-made ramps are used as they are; any other colour is darkened until white text on 600/700/800 passes AA, 700 passes on 50, and 500 passes 3:1. `accent.test.ts` holds those rules.
  - The fonts are Noto Sans and Poppins (shipped) or one of ten Google Fonts. Hindi always falls back to Noto Sans Devanagari.
- **The admin's page builder is generic:**
  - Each section type is described once (fields, labels and starting content in `sectionSpecs.ts`), and one renderer draws every form.
  - The Hindi view shows only the texts, as a translation view.
- **Location on arrival:**
  - On a visitor's first public page the site calls `getCurrentPosition` straight away, so the browser asks.
  - `POST /v1/locate` answers whether the point is inside an active area. This is the same rule booking uses.
  - The header shows the area, a "not yet in your area" banner with "Notify me" (stored in `area_requests`, listed in Admin → Website), or an area picker.
  - The answer is kept for the visit, and a new address at checkout starts with that pin.
- **SEO:**
  - Each page has a title, a description, a sharing photo and noindex. `usePageMeta` sets the title template, the description, the canonical link, Open Graph and Twitter tags, and JSON-LD: BeautySalon on home and FAQPage wherever questions are shown.
  - `GET /v1/sitemap.xml` lists the published pages and the services live, and `robots.txt` points to it.

## Alternatives considered
- **A hosted CMS (Strapi, Sanity, Contentful):** another service to run or pay for, another login for the client, and content that can't share the app's zod contracts or its booking components (categories, services, the contact form).
- **Rich HTML from a WYSIWYG editor:** pages would break the design system and need HTML sanitising. Typed sections keep every page on-brand and accessible.
- **Server-side rendering for SEO:** the right long-term answer for link previews, but it is a hosting change. Search engines render the client-side tags; WhatsApp and Facebook previews read only the HTML, so they need the tags injected where the site is hosted.

## Consequences
- **Admins can change the whole website without a developer**, including its look. The contrast rules can't be broken from the admin.
- **The page JSON can be large.** `/v1/admin/site` accepts up to 1 MB; everything else keeps the 100 kb limit.
- **Unused locale strings:** the old home, about and join strings in `public.json` are unused now. Texts on website pages are content, not locale strings.
- **Before launch,** the client should replace the default photos with their own, fill in the legal details (Brand & theme), and add social and app links. The admin shows a reminder until the legal details are filled in.
- **Link previews on WhatsApp and Facebook** need the Open Graph tags in the served HTML (a CloudFront function or prerendering). Until then they show the default title and description from `index.html`.
