# Changing the website (Admin → Website)

Everything on the public website is changed in **Admin → Website** (ADR-0021). No developer is needed.

## Pages
- **Pages** lists every page: Home, About, Contact, Join, the three policies and the Faridabad page, plus any you add.
- Open a page to see its **sections** in order. Click a section to open it.
- **Buttons on each section:**
  - **eye:** hide or show it;
  - **arrows:** move it up or down;
  - **copy:** duplicate it;
  - **+:** add a section below;
  - **bin:** remove it.
- **Add a section** offers 20 kinds: banner slider, categories, services row, offers, steps, numbers, features, reviews, questions, photo and text, text, gallery, video, call to action, areas, contact form, professional application, and more.
- **English / हिन्दी** at the top switches the language you are typing in. Hindi left empty shows the English text.
- **Saving and publishing:**
  - **Save draft** keeps your changes without showing them to visitors.
  - **Preview** opens the draft in a new tab, marked "Preview".
  - **Publish** puts the page live.
- **History** lists every published version. **Restore** puts one live again.
- **Reset to default** brings back the page as it first shipped, as a draft.
- **New page** creates a page at its own address (for example `/bridal-makeup-at-home`). Add it to the menu in **Menus & footer**.

## Photos
- Every photo has **Upload** / **Replace photo**. JPEG, PNG, WebP or HEIC up to 5 MB; the site makes the web sizes itself.
- **Videos:** the banner slider and the Video section have **Upload a video** (MP4 or WebM, up to 25 MB). A silent 10–20 second clip loads fastest. Banner videos play on computers; phones show the slide's photo.
- The site ships with free-licence photos (credits in `scripts/images/site/LICENSES.md`). Replace them with your own whenever you like.
- **Service and category photos:**
  - Service photos are set in **Services**, and category photos in **Categories**.
  - A service without a photo shows its category's photo.

## Live values in texts
Type these anywhere and the site fills them in:

| Type | Shows |
| --- | --- |
| `{{min}}`–`{{max}}` | The arrival promise in minutes (Brand & theme) |
| `{{phone}}`, `{{email}}`, `{{whatsapp}}` | Your contact details |
| `{{open}}`, `{{close}}` | Opening hours (Settings) |
| `{{cancelFee}}`, `{{noShowFee}}` | Fees (Settings) |
| `{{company}}`, `{{gstin}}`, `{{grievance}}`, `{{city}}`, `{{address}}` | Legal details |
| `{{services}}` | How many services you offer (rounded down to tens) |

**Formatting in long texts:**

| Type | Gives |
| --- | --- |
| `## Heading` | A heading |
| `- item` | A list item |
| `**bold**` | Bold text |
| `[link text](/page)` | A link |
| A line starting with `>` | A highlighted note |

## Brand & theme
- **Look:** the name, logo, brand colour, heading and text fonts, and corner style.
  - A preview shows your choices before you save.
  - A very light colour is darkened a little where text sits on it, so everything stays readable.
- **Details:** contact details, the arrival promise and the legal details used by the policies.
- **Photos:** the photo beside the login form, and the one on "Page not found".

## Menus & footer
- The header menu.
- The announcement bar above it.
- The footer columns and text.
- Social media links.
- App store links.
- The professionals' application form link.

## SEO & location
- **Search and sharing:** the title pattern, the description and the sharing photo used when a page has none of its own. Each page has its own SEO panel in the page editor.
- **Location:**
  - Whether visitors are asked for their location when they open the site.
  - The message shown to visitors outside your areas.
  - The areas themselves are drawn in **Settings → Areas**.

## Area requests
Visitors outside your areas can leave their number. Their requests appear here, with a map link, so you know where to expand next.

## Before launch
- [ ] Replace the default photos with your own (banners, categories, About, Join).
- [ ] Fill in the legal details: registered company name, GSTIN, Grievance Officer, city for disputes. Until then the admin shows a reminder.
- [ ] Add the WhatsApp number, social links and app links if you have them.
- [ ] Read the three policies with your legal adviser, edit them, and remove the "Draft for review" note.
