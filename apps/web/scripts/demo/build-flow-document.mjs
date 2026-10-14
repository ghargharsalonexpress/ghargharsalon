import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { APPS, DOCUMENT, SCREENS, STAGES } from "./flow-document.content.mjs";

/**
 * npm run flow-document (second half): turns the screens saved by e2e-tour/project-flow.tour.mjs
 * and the descriptions in flow-document.content.mjs into Proposal/project-flow.html and
 * Proposal/Project_Flow.pdf: every stage with a storyboard and a step table, then a card for
 * every screen (purpose, what's on it, where it leads), the other paths and a screen index.
 */

const SHOTS_DIR = process.env.FLOW_DOCUMENT_DIR ? pathToFileURL(`${process.env.FLOW_DOCUMENT_DIR.replace(/[\\/]$/, "")}/`) : new URL("../../../../../Proposal/project-flow/", import.meta.url);
const OUT_DIR = new URL("../", SHOTS_DIR);
const DATA = new URL("screens.json", SHOTS_DIR);
const HTML_FILE = new URL("project-flow.html", OUT_DIR);
const PDF_FILE = new URL("Project_Flow.pdf", OUT_DIR);
const FOLDER = decodeURIComponent(SHOTS_DIR.pathname.split("/").filter(Boolean).at(-1));

if (!existsSync(DATA)) {
  console.error(`No screens yet (${fileURLToPath(DATA)}). Run "npm run flow-document" in apps/web.`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(DATA, "utf8"));
const captured = new Map(data.screens.map((screen) => [screen.id, screen]));

// ---------- checks: every described screen was captured, and every captured one is described ----------

const used = STAGES.flatMap((stage) => stage.screens);
const problems = [
  ...used.filter((id) => !SCREENS[id]).map((id) => `no description for ${id}`),
  ...used.filter((id) => !captured.has(id)).map((id) => `no screenshot for ${id}`),
  ...[...captured.keys()].filter((id) => !used.includes(id)).map((id) => `screenshot ${id} isn't placed in any stage`),
  ...Object.values(SCREENS).flatMap((screen) => (screen.go ?? []).filter((link) => link.to && !SCREENS[link.to]).map((link) => `unknown link target ${link.to}`)),
  ...STAGES.flatMap((stage) => (stage.steps ?? []).filter((step) => !SCREENS[step.screen] || (step.next && !SCREENS[step.next])).map((step) => `stage ${stage.id}: unknown screen in step ${step.screen} → ${step.next}`)),
];
if (problems.length) {
  console.error(`The flow document isn't consistent:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

// ---------- screen codes: C-01, P-01, A-01 in order of first appearance ----------

const code = new Map();
const counters = {};
for (const id of used) {
  if (code.has(id)) continue;
  const app = captured.get(id).who;
  counters[app] = (counters[app] ?? 0) + 1;
  code.set(id, `${APPS[app].prefix}-${String(counters[app]).padStart(2, "0")}`);
}
const stageOf = new Map();
for (const stage of STAGES) for (const id of stage.screens) if (!stageOf.has(id)) stageOf.set(id, stage);
const incoming = new Map();
for (const [id, screen] of Object.entries(SCREENS)) for (const link of screen.go ?? []) if (link.to) incoming.set(link.to, [...(incoming.get(link.to) ?? []), id]);

const html = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Text with **bold** marks. */
const rich = (text) => html(text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const ref = (id) => `<span class="ref"><span class="code">${code.get(id)}</span> ${html(SCREENS[id].title)}</span>`;
const app = (id) => APPS[captured.get(id).who];
const img = (id) => `${FOLDER}/${html(captured.get(id).file)}`;
const isLaptop = (id) => captured.get(id).who === "admin";
const address = (id) =>
  captured
    .get(id)
    .path.replace(/[a-f0-9]{24}/g, ":id")
    .replace(/token=[^&]+/g, "token=…")
    .replace(/&mode=set/, "")
    .replace(/next=%2F/g, "next=/");
const ist = (iso, options) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...options }).format(new Date(iso));
const capturedOn = ist(data.capturedAt, { day: "numeric", month: "long", year: "numeric" });

// ---------- building blocks ----------

const storyboard = (stage) => {
  const nodes = stage.storyboard ?? stage.screens;
  const label = (from) => stage.steps?.find((step) => step.screen === from)?.short ?? "";
  return `<div class="story">${nodes
    .map(
      (id, index) => `${index ? `<div class="arrow"><span class="arrow-line">→</span><span class="arrow-label">${html(label(nodes[index - 1]))}</span></div>` : ""}<figure class="node ${isLaptop(id) ? "wide" : ""}"><img src="${img(id)}" alt=""><figcaption><span class="code">${code.get(id)}</span> ${html(SCREENS[id].title)}</figcaption></figure>`,
    )
    .join("")}</div>`;
};

const stepsTable = (stage) =>
  stage.steps?.length
    ? `<table class="steps">
      <thead><tr><th class="n">#</th><th>Screen</th><th>What the person does</th><th>What the system does</th><th>Next screen</th></tr></thead>
      <tbody>${stage.steps
        .map(
          (step, index) =>
            `<tr><td class="n">${index + 1}</td><td>${ref(step.screen)}<div class="by">${html(app(step.screen).short)}</div></td><td>${rich(step.user)}</td><td>${rich(step.system)}</td><td>${step.next ? ref(step.next) : html(step.nextText ?? "—")}</td></tr>`,
        )
        .join("")}</tbody>
    </table>`
    : "";

const card = (id) => {
  const screen = SCREENS[id];
  const shot = captured.get(id);
  const from = [...new Set(incoming.get(id) ?? [])];
  const go = screen.go ?? [];
  return `<article class="card ${isLaptop(id) ? "laptop" : "phone"}">
      <img class="shot" src="${img(id)}" alt="${html(`${code.get(id)} ${screen.title}`)}">
      <div class="info">
        <p class="card-head"><span class="code big">${code.get(id)}</span><span class="card-title">${html(screen.title)}</span></p>
        <p class="meta">${html(APPS[shot.who].name)} · <span class="url">${html(address(id))}</span></p>
        <h4>Purpose</h4>
        <p>${rich(screen.purpose)}</p>
        <h4>On this screen</h4>
        <ul>${screen.elements.map((item) => `<li>${rich(item)}</li>`).join("")}</ul>
        ${go.length ? `<h4>Where it leads</h4><ul class="links">${go.map((link) => `<li>${rich(link.when)} → ${link.to ? ref(link.to) : `<b>${html(link.text)}</b>`}</li>`).join("")}</ul>` : ""}
        ${from.length ? `<p class="from"><b>Comes from:</b> ${from.map((item) => `<span class="code">${code.get(item)}</span>`).join(" ")}</p>` : ""}
      </div>
    </article>`;
};

/** Phones two to a row; computer screens on their own. */
const cards = (ids) => {
  const rows = [];
  let pair = [];
  for (const id of ids) {
    if (isLaptop(id)) {
      if (pair.length) rows.push(pair);
      rows.push([id]);
      pair = [];
    } else {
      pair.push(id);
      if (pair.length === 2) {
        rows.push(pair);
        pair = [];
      }
    }
  }
  if (pair.length) rows.push(pair);
  return rows.map((row) => `<div class="card-row">${row.map(card).join("")}</div>`).join("");
};

const chapter = (stage) => `
  <section class="chapter">
    <header class="chapter-head">
      <span class="stage">${html(stage.label)}</span>
      <div><h1>${html(stage.title)}</h1><p class="who">${html(stage.who)}</p></div>
    </header>
    <div class="intro">
      <div class="box"><h3>In short</h3><p>${rich(stage.inShort)}</p></div>
      ${stage.goal ? `<div class="box soft"><h3>Done when</h3><p>${rich(stage.goal)}</p></div>` : ""}
    </div>
    <h2>The flow</h2>
    ${storyboard(stage)}
    ${stage.steps?.length ? `<h2>Step by step</h2>${stepsTable(stage)}` : ""}
  </section>
  <section class="screens">
    <p class="screens-label">${html(stage.label)} · ${html(stage.title)} · screens</p>
    ${cards(stage.screens)}
  </section>`;

const systemDiagram = `
<svg class="diagram" viewBox="0 0 1000 420" role="img" aria-label="How the three apps, the server and the outside services connect">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6B655D"/></marker></defs>
  <g font-family="Segoe UI, Noto Sans, Arial, sans-serif">
    <rect x="20" y="20" width="270" height="110" rx="14" fill="#FBEFF4" stroke="#9E1F55" stroke-width="2"/>
    <text x="155" y="58" text-anchor="middle" font-size="21" font-weight="700" fill="#84184A">Customer website</text>
    <text x="155" y="86" text-anchor="middle" font-size="15" fill="#4F4A43">Book, pay, track, rate</text>
    <text x="155" y="108" text-anchor="middle" font-size="14" fill="#6B655D">Phone or computer · English and Hindi</text>
    <rect x="365" y="20" width="270" height="110" rx="14" fill="#E9F3EE" stroke="#1D7044" stroke-width="2"/>
    <text x="500" y="58" text-anchor="middle" font-size="21" font-weight="700" fill="#14532D">Professional app</text>
    <text x="500" y="86" text-anchor="middle" font-size="15" fill="#4F4A43">Go online, accept, travel, start, earn</text>
    <text x="500" y="108" text-anchor="middle" font-size="14" fill="#6B655D">Installable on the phone · Hindi first</text>
    <rect x="710" y="20" width="270" height="110" rx="14" fill="#EEF2FA" stroke="#2F5DA8" stroke-width="2"/>
    <text x="845" y="58" text-anchor="middle" font-size="21" font-weight="700" fill="#1E3A6E">Admin</text>
    <text x="845" y="86" text-anchor="middle" font-size="15" fill="#4F4A43">Watch, help, refund, set prices</text>
    <text x="845" y="108" text-anchor="middle" font-size="14" fill="#6B655D">Computer · English</text>
    <rect x="300" y="200" width="400" height="100" rx="14" fill="#F6F4F1" stroke="#1F1C19" stroke-width="2"/>
    <text x="500" y="240" text-anchor="middle" font-size="21" font-weight="700" fill="#1F1C19">Server and database</text>
    <text x="500" y="268" text-anchor="middle" font-size="14" fill="#4F4A43">Bookings, matching, payments, refunds, invoices, audit log</text>
    <text x="500" y="288" text-anchor="middle" font-size="14" fill="#4F4A43">Live updates to every open screen</text>
    <line x1="155" y1="130" x2="380" y2="200" stroke="#6B655D" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <line x1="500" y1="130" x2="500" y2="200" stroke="#6B655D" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <line x1="845" y1="130" x2="620" y2="200" stroke="#6B655D" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
    <rect x="20" y="320" width="270" height="80" rx="12" fill="#FFFFFF" stroke="#D9D5CF" stroke-width="1.5"/>
    <text x="155" y="352" text-anchor="middle" font-size="17" font-weight="600" fill="#1F1C19">Razorpay</text>
    <text x="155" y="377" text-anchor="middle" font-size="14" fill="#6B655D">UPI, cards, netbanking, refunds</text>
    <rect x="365" y="330" width="270" height="70" rx="12" fill="#FFFFFF" stroke="#D9D5CF" stroke-width="1.5"/>
    <text x="500" y="360" text-anchor="middle" font-size="17" font-weight="600" fill="#1F1C19">Google Maps</text>
    <text x="500" y="384" text-anchor="middle" font-size="14" fill="#6B655D">Live map and directions</text>
    <rect x="710" y="320" width="270" height="80" rx="12" fill="#FFFFFF" stroke="#D9D5CF" stroke-width="1.5"/>
    <text x="845" y="352" text-anchor="middle" font-size="17" font-weight="600" fill="#1F1C19">Emails and phone alerts</text>
    <text x="845" y="377" text-anchor="middle" font-size="14" fill="#6B655D">Amazon email, web push alerts</text>
    <line x1="300" y1="285" x2="250" y2="320" stroke="#B5AFA7" stroke-width="2" stroke-dasharray="6 5"/>
    <line x1="500" y1="300" x2="500" y2="330" stroke="#B5AFA7" stroke-width="2" stroke-dasharray="6 5"/>
    <line x1="700" y1="285" x2="750" y2="320" stroke="#B5AFA7" stroke-width="2" stroke-dasharray="6 5"/>
  </g>
</svg>`;

const happyPath = `<ol class="path">${STAGES.filter((stage) => stage.happy)
  .map((stage) => `<li><span class="stage">${html(stage.label)}</span><b>${html(stage.title)}</b><span class="who">${html(stage.who)}</span></li>`)
  .join("")}</ol>`;

const index = `<table class="index">
  <thead><tr><th>Code</th><th>Screen</th><th>App</th><th>Address</th><th>Stage</th></tr></thead>
  <tbody>${[...code.keys()]
    .sort((a, b) => code.get(a).localeCompare(code.get(b)))
    .map((id) => `<tr><td><span class="code">${code.get(id)}</span></td><td>${html(SCREENS[id].title)}</td><td>${html(app(id).name)}</td><td class="url">${html(address(id))}</td><td>${html(stageOf.get(id).label)}</td></tr>`)
    .join("")}</tbody>
</table>`;

const counts = Object.fromEntries(Object.keys(APPS).map((key) => [key, [...code.keys()].filter((id) => captured.get(id).who === key).length]));
const hoursNote = data.hoursOpenedForCapture ? " These screens were captured outside the 8 am–9 pm service hours, so the hours were opened for the test and set back afterwards." : "";

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${html(DOCUMENT.title)}</title>
<style>
  @page { size: A4 landscape; margin: 11mm 13mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif; color: #1F1C19; font-size: 9.5pt; line-height: 1.42; }
  h1 { font-size: 22pt; line-height: 1.15; margin: 0; font-weight: 650; }
  h2 { font-size: 13pt; margin: 6mm 0 3mm; font-weight: 650; break-after: avoid; }
  h3 { font-size: 11pt; margin: 0 0 1.5mm; font-weight: 650; }
  h4 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #6B655D; margin: 2.6mm 0 0.8mm; font-weight: 650; }
  p { margin: 0; }
  ul { margin: 0; padding-left: 4.5mm; }
  li { margin: 0.5mm 0; }
  .cover, .chapter, .part { break-before: page; }
  .screens { margin-top: 7mm; }
  .cover { break-before: auto; }
  .lead { color: #4F4A43; font-size: 12pt; max-width: 230mm; margin-top: 3mm; }
  .grid2 { display: grid; grid-template-columns: 1.1fr 1fr; gap: 7mm; margin-top: 7mm; }
  .box { border: 1.5px solid #1F1C19; border-radius: 3mm; padding: 4mm 5mm; }
  .box.soft { border: 1px solid #E2DFDA; }
  .small { font-size: 8.5pt; color: #4F4A43; }
  .kicker { color: #9E1F55; font-weight: 650; font-size: 10pt; letter-spacing: 0.03em; }
  .contents { columns: 2; column-gap: 10mm; padding-left: 5mm; }
  .stats { display: flex; gap: 4mm; margin-top: 5mm; }
  .stat { border: 1px solid #E2DFDA; border-radius: 2.5mm; padding: 3mm 4mm; flex: 1; }
  .stat b { display: block; font-size: 18pt; line-height: 1.1; }
  .chapter-head { display: flex; align-items: center; gap: 4mm; margin-bottom: 4mm; }
  .stage { display: inline-block; background: #9E1F55; color: #fff; font-weight: 700; font-size: 9pt; padding: 1.2mm 3mm; border-radius: 99px; white-space: nowrap; }
  .who { color: #6B655D; font-size: 10pt; margin-top: 1mm; }
  .intro { display: grid; grid-template-columns: 1.4fr 1fr; gap: 5mm; }
  .story { display: flex; flex-wrap: wrap; align-items: flex-start; row-gap: 4mm; }
  .node { margin: 0; width: 22mm; text-align: center; break-inside: avoid; }
  .node.wide { width: 44mm; }
  .node img { display: block; width: 100%; border: 0.3mm solid #D9D5CF; border-radius: 1.6mm; }
  .node figcaption { font-size: 7.5pt; line-height: 1.25; margin-top: 1mm; color: #1F1C19; }
  .arrow { width: 16mm; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 11mm; }
  .arrow-line { font-size: 15pt; color: #9E1F55; line-height: 1; }
  .arrow-label { font-size: 6.8pt; line-height: 1.2; color: #4F4A43; text-align: center; margin-top: 0.8mm; }
  .code { display: inline-block; font-weight: 700; font-size: 7.5pt; color: #84184A; background: #FBEFF4; border-radius: 99px; padding: 0.2mm 1.6mm; white-space: nowrap; }
  .code.big { font-size: 9pt; padding: 0.6mm 2.4mm; }
  .ref { white-space: normal; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; color: #6B655D; border-bottom: 1.5px solid #1F1C19; padding: 1.6mm 2mm; }
  td { vertical-align: top; border-bottom: 1px solid #E2DFDA; padding: 1.8mm 2mm; font-size: 8.6pt; }
  .steps td:nth-child(2), .steps td:nth-child(5) { width: 44mm; }
  .steps .n { width: 7mm; color: #6B655D; }
  .by { color: #6B655D; font-size: 7.5pt; margin-top: 0.5mm; }
  .card-row { display: flex; gap: 4mm; margin-bottom: 3mm; break-inside: avoid; }
  .card { display: flex; gap: 3mm; border: 1px solid #E2DFDA; border-radius: 3mm; padding: 2.4mm; break-inside: avoid; }
  .card.phone { width: calc(50% - 2mm); }
  .card.phone .shot { width: 38mm; height: auto; flex: none; align-self: flex-start; border: 0.3mm solid #D9D5CF; border-radius: 1.6mm; }
  .card.laptop { width: 100%; }
  .card.laptop .shot { width: 128mm; height: auto; flex: none; align-self: flex-start; border: 0.3mm solid #D9D5CF; border-radius: 1.4mm; }
  .info { min-width: 0; font-size: 8.1pt; line-height: 1.36; }
  .info h4 { margin: 1.8mm 0 0.5mm; font-size: 7.6pt; }
  .info li { margin: 0.3mm 0; }
  .screens-label { break-after: avoid; margin: 0 0 2mm; font-size: 8pt; color: #6B655D; font-weight: 650; letter-spacing: 0.03em; text-transform: uppercase; }
  .card-head { display: flex; align-items: center; gap: 2mm; }
  .card-title { font-weight: 650; font-size: 10.5pt; line-height: 1.2; }
  .meta { color: #6B655D; font-size: 7.8pt; margin-top: 1mm; }
  .url { font-family: Consolas, "Cascadia Mono", monospace; font-size: 7.6pt; color: #4F4A43; word-break: break-all; }
  .links { list-style: none; padding-left: 0; }
  .from { margin-top: 2mm; color: #4F4A43; font-size: 8pt; }
  .diagram { width: 100%; max-height: 105mm; margin-top: 4mm; }
  .path { list-style: none; padding: 0; margin: 4mm 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; counter-reset: none; }
  .path li { border: 1px solid #E2DFDA; border-radius: 2.5mm; padding: 2.5mm 3mm; display: flex; flex-direction: column; gap: 1mm; }
  .path .who { font-size: 8pt; margin: 0; }
  .legend { display: flex; gap: 6mm; margin-top: 4mm; flex-wrap: wrap; }
  .index td { padding: 1.1mm 2mm; font-size: 8.2pt; }
</style>
</head>
<body>

  <section class="cover">
    <p class="kicker">${html(DOCUMENT.kicker)}</p>
    <h1>${html(DOCUMENT.title)}</h1>
    <p class="lead">${rich(DOCUMENT.lead)}</p>
    <div class="stats">
      <div class="stat"><b>${STAGES.filter((stage) => stage.happy).length}</b>stages, start to end</div>
      <div class="stat"><b>${code.size}</b>screens, each with its purpose, contents and links</div>
      <div class="stat"><b>${counts.customer}</b>customer screens</div>
      <div class="stat"><b>${counts.pro}</b>professional screens (Hindi)</div>
      <div class="stat"><b>${counts.admin}</b>team (admin) screens</div>
    </div>
    <div class="grid2">
      <div class="box"><h3>In short</h3><ul>${DOCUMENT.inShort.map((item) => `<li>${rich(item)}</li>`).join("")}</ul></div>
      <div class="box soft"><h3>Contents</h3><ol class="contents">${["How the system fits together", "The happy path at a glance", ...STAGES.map((stage) => `${stage.label}: ${stage.title}`), "Screen index"].map((item) => `<li>${html(item)}</li>`).join("")}</ol></div>
    </div>
    <p class="small" style="margin-top:5mm">${rich(DOCUMENT.note)} Captured on ${html(capturedOn)} from the working system on our test setup.${html(hoursNote)}</p>
  </section>

  <section class="part">
    <p class="kicker">Overview</p>
    <h1>How the system fits together</h1>
    <p class="lead">${rich(DOCUMENT.system)}</p>
    ${systemDiagram}
    <div class="legend small">
      <span><span class="code">C-01</span> customer screen</span>
      <span><span class="code">P-01</span> professional screen</span>
      <span><span class="code">A-01</span> team (admin) screen</span>
      <span>→ what the person does to reach the next screen</span>
    </div>
  </section>

  <section class="part">
    <p class="kicker">Overview</p>
    <h1>The happy path at a glance</h1>
    <p class="lead">${rich(DOCUMENT.happyPath)}</p>
    ${happyPath}
    <div class="box soft" style="margin-top:5mm"><h3>When things don't go to plan</h3><p>${rich(DOCUMENT.otherPaths)}</p></div>
  </section>
${STAGES.map(chapter).join("")}

  <section class="part">
    <p class="kicker">Reference</p>
    <h1>Screen index</h1>
    <p class="lead">Every screen in this document, with its code, its app and its web address (<span class="url">:id</span> stands for a booking or person).</p>
    ${index}
  </section>

</body>
</html>
`;

writeFileSync(HTML_FILE, page);
console.log(`Wrote ${fileURLToPath(HTML_FILE)} (${code.size} screens in ${STAGES.length} stages)`);

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
    footerTemplate: `<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:7.5px;color:#6B655D;padding:0 13mm;display:flex;justify-content:space-between"><span>${html(DOCUMENT.title)} · ${html(DOCUMENT.version)} · ${html(capturedOn)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
  });
  console.log(`Wrote ${fileURLToPath(PDF_FILE)}`);
} finally {
  await browser.close();
}
