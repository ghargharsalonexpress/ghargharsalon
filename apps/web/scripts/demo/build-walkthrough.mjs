import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

/**
 * npm run walkthrough (second half): turns the screenshots and steps.json written by
 * e2e-tour/happy-path.tour.mjs into Proposal/happy-path.html and Proposal/Happy_Path.pdf
 * (A4 landscape, simple English, in the style of the earlier client PDFs).
 */

const SHOTS_DIR = process.env.WALKTHROUGH_DIR ? pathToFileURL(`${process.env.WALKTHROUGH_DIR.replace(/[\\/]$/, "")}/`) : new URL("../../../../../Proposal/happy-path/", import.meta.url);
const OUT_DIR = new URL("../", SHOTS_DIR);
const STEPS = new URL("steps.json", SHOTS_DIR);
const HTML_FILE = new URL("happy-path.html", OUT_DIR);
const PDF_FILE = new URL("Happy_Path.pdf", OUT_DIR);
const FOLDER = decodeURIComponent(SHOTS_DIR.pathname.split("/").filter(Boolean).at(-1));

if (!existsSync(STEPS)) {
  console.error(`No screenshots yet (${fileURLToPath(STEPS)}). Run "npm run walkthrough" in apps/web.`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(STEPS, "utf8"));
const { parts, stages } = data;

const html = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const WHO = { customer: "Customer · English", pro: "Professional · Hindi", admin: "Admin" };
const number = new Map(stages.map((stage, index) => [stage.id, index + 1]));
const ist = (iso, options) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...options }).format(new Date(iso));
const capturedOn = ist(data.capturedAt, { day: "numeric", month: "long", year: "numeric" });
const capturedAt = ist(data.capturedAt, { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?([ap])m$/i, " $1m").toLowerCase();

// ---------- pages: up to four phones a page (a pair never split, pages evened out), the laptop one a page ----------

const PHONE_SLOTS = 4;
const isLaptop = (stage) => stage.shots.some((shot) => shot.who === "admin");
const pages = [];
for (const key of Object.keys(parts)) {
  const partStages = stages.filter((item) => item.part === key);
  const phoneSlots = partStages.filter((item) => !isLaptop(item)).reduce((total, item) => total + item.shots.length, 0);
  // Five phones become three and two, not four and one.
  const perPage = phoneSlots ? Math.ceil(phoneSlots / Math.ceil(phoneSlots / PHONE_SLOTS)) : PHONE_SLOTS;
  let current = null;
  let started = false;
  for (const stage of partStages) {
    if (isLaptop(stage)) {
      pages.push({ kind: "laptop", part: key, continued: started, stages: [stage] });
      started = true;
      current = null;
      continue;
    }
    const used = current ? current.stages.reduce((total, item) => total + item.shots.length, 0) : PHONE_SLOTS;
    if (!current || used + stage.shots.length > Math.max(perPage, stage.shots.length)) {
      current = { kind: "phones", part: key, continued: started, stages: [] };
      pages.push(current);
      started = true;
    }
    current.stages.push(stage);
  }
}

const range = (key) => {
  const numbers = stages.filter((stage) => stage.part === key).map((stage) => number.get(stage.id));
  return numbers.length > 1 ? `steps ${numbers[0]}–${numbers.at(-1)}` : `step ${numbers[0]}`;
};

const partHeader = (key, continued) => `
    <header class="part">
      <span class="letter">${key}</span>
      <div><h2>${html(parts[key].title)}${continued ? ' <span class="cont">(continued)</span>' : ""}</h2><p>${html(parts[key].who)}</p></div>
    </header>`;

const caption = (stage) => `<p class="title"><span class="num">${number.get(stage.id)}</span>${html(stage.title)}</p><p class="caption">${html(stage.caption)}</p>`;

const phoneCard = (stage) => `
      <figure class="card">
        <div class="shots">${stage.shots
          .map((shot) => `<div class="phone"><img src="${FOLDER}/${html(shot.file)}" alt="${html(`${WHO[shot.who]}: ${stage.title}`)}"><span class="who">${WHO[shot.who]}</span></div>`)
          .join("")}</div>
        <figcaption>${caption(stage)}</figcaption>
      </figure>`;

const body = pages
  .map((page) =>
    page.kind === "laptop"
      ? `
  <section class="page">${partHeader(page.part, page.continued)}
    <figure class="laptop">
      <figcaption>${caption(page.stages[0])}</figcaption>
      <img src="${FOLDER}/${html(page.stages[0].shots[0].file)}" alt="${html(`Admin: ${page.stages[0].title}`)}">
    </figure>
  </section>`
      : `
  <section class="page">${partHeader(page.part, page.continued)}
    <div class="row">${page.stages.map(phoneCard).join("")}
    </div>
  </section>`,
  )
  .join("");

const hoursNote = data.hoursOpenedForCapture
  ? ` We captured these screens at ${capturedAt}, outside the 8 am–9 pm service hours, so the hours were opened for the test and set back right after the job (you can see both changes in the audit log).`
  : "";

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Happy path, screen by screen</title>
<style>
  @page { size: A4 landscape; margin: 11mm 14mm 13mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", "Noto Sans", Arial, sans-serif; color: #1F1C19; font-size: 10.5pt; line-height: 1.45; }
  .page { break-after: page; height: 185mm; overflow: hidden; }
  .page:last-child { break-after: auto; }
  h1 { font-size: 24pt; line-height: 1.15; margin: 0 0 3mm; font-weight: 600; }
  h2 { font-size: 14pt; margin: 0; font-weight: 600; line-height: 1.25; }
  h3 { font-size: 12pt; margin: 0 0 2mm; font-weight: 600; }
  p { margin: 0; }
  ul { margin: 0; padding-left: 5mm; }
  li { margin: 1.2mm 0; }
  .lead { color: #4F4A43; font-size: 12pt; max-width: 225mm; }
  .cover-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 8mm; margin-top: 6mm; }
  .box { border: 1.5px solid #1F1C19; border-radius: 3mm; padding: 5mm 6mm; }
  .box.soft { border: 1px solid #E2DFDA; }
  .parts { list-style: none; padding: 0; margin: 0; }
  .parts li { display: flex; gap: 3mm; align-items: baseline; margin: 1.6mm 0; }
  .parts .letter { flex: none; }
  .small { font-size: 9pt; color: #4F4A43; }
  .golive { margin-top: 5mm; }
  .golive ul { display: grid; grid-template-columns: 1fr 1fr; column-gap: 10mm; }
  .golive li { margin: 0.8mm 0; }
  .note { margin-top: 4mm; max-width: 255mm; }
  .letter { display: inline-flex; align-items: center; justify-content: center; width: 8mm; height: 8mm; border-radius: 2mm; background: #9E1F55; color: #fff; font-weight: 700; font-size: 11pt; }
  .part { display: flex; align-items: center; gap: 3mm; margin-bottom: 5mm; }
  .part p { color: #6B655D; font-size: 9.5pt; }
  .cont { color: #6B655D; font-weight: 400; font-size: 11pt; }
  .row { display: flex; justify-content: center; align-items: flex-start; gap: 8mm; }
  .card { margin: 0; display: flex; flex-direction: column; gap: 2.5mm; }
  .shots { display: flex; gap: 4mm; }
  .phone { display: flex; flex-direction: column; align-items: center; gap: 1.2mm; }
  .phone img { display: block; height: 124mm; width: auto; border: 0.35mm solid #D9D5CF; border-radius: 3mm; }
  .who { font-size: 8pt; color: #6B655D; letter-spacing: 0.02em; }
  .card figcaption { width: 0; min-width: 100%; }
  .title { font-weight: 600; font-size: 10.5pt; display: flex; align-items: baseline; gap: 2mm; }
  .num { flex: none; display: inline-flex; align-items: center; justify-content: center; min-width: 5.5mm; height: 5.5mm; padding: 0 1mm; border-radius: 99px; background: #FBEFF4; color: #84184A; font-size: 8.5pt; font-weight: 700; }
  .caption { font-size: 9pt; color: #4F4A43; margin-top: 0.8mm; }
  .laptop { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 3.5mm; }
  .laptop figcaption { width: 238mm; }
  .laptop img { display: block; width: 238mm; height: auto; border: 0.35mm solid #D9D5CF; border-radius: 2mm; }
</style>
</head>
<body>

  <section class="page">
    <h1>The happy path, screen by screen</h1>
    <p class="lead">One booking from start to finish on the working system: a customer books a facial at home, a nearby professional accepts in seconds, arrives, starts with the customer's code and completes the service. The team sees all of it.</p>

    <div class="cover-grid">
      <div class="box">
        <h3>In short</h3>
        <ul>
          <li><b>Customer</b> books on the website from their phone, in English. They pay online, follow the professional live, share a 4-digit code to start, rate the service and get a GST invoice.</li>
          <li><b>Professional</b> uses the professional app in Hindi. A job alert fills the screen with a sound; one tap accepts. The service starts only with the customer's code, and the earning shows at once.</li>
          <li><b>Team</b> sees every booking live and can act on it: notes, refunds, cancellations, customers, reviews, payouts and settings, with every change recorded.</li>
        </ul>
      </div>
      <div class="box soft">
        <h3>What's inside (${stages.length} steps)</h3>
        <ul class="parts">${Object.keys(parts)
          .map((key) => `<li><span class="letter">${key}</span><span><b>${html(parts[key].title)}</b> · ${html(parts[key].who)} · ${range(key)}</span></li>`)
          .join("")}</ul>
      </div>
    </div>

    <div class="box soft golive">
      <h3>To go live, we need from you</h3>
      <ul>
        <li>Razorpay account keys, for payments and refunds</li>
        <li>A Google Maps key, for the live map and directions</li>
        <li>The brand name, and your colour choice (A or B)</li>
        <li>Company legal name, address and GSTIN, for invoices</li>
        <li>Amazon Web Services access, for emails and photos</li>
        <li>A read-through of the Hindi text and the policy pages</li>
      </ul>
    </div>

    <p class="small note">These are real screens from the working system on our test setup, captured on ${capturedOn}. ${html(data.people.customer)} (customer) and ${html(data.people.pro)} (professional) are test accounts; phone numbers and addresses are test data. Payments use a test payment screen until your Razorpay keys are added, and live maps appear once the Google Maps key is added. “Brand” is a placeholder until you confirm the name.${html(hoursNote)}</p>
  </section>
${body}

</body>
</html>
`;

writeFileSync(HTML_FILE, page);
console.log(`Wrote ${fileURLToPath(HTML_FILE)} (${pages.length + 1} pages, ${stages.length} steps)`);

// Printed by Edge (Playwright's msedge channel), so it matches what the browser shows.
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
try {
  const tab = await browser.newPage();
  await tab.goto(HTML_FILE.href, { waitUntil: "load" });
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((resolve) => image.addEventListener("load", resolve, { once: true })))));
  });
  const broken = await tab.evaluate(() => [...document.images].filter((image) => image.naturalWidth === 0).map((image) => image.getAttribute("src")));
  if (broken.length) throw new Error(`Missing screenshots: ${broken.join(", ")}`);
  await tab.pdf({
    path: fileURLToPath(PDF_FILE),
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5px;color:#6B655D;padding:0 14mm;display:flex;justify-content:space-between"><span>The happy path, screen by screen · ${html(capturedOn)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.log(`Wrote ${fileURLToPath(PDF_FILE)}`);
} finally {
  await browser.close();
}
