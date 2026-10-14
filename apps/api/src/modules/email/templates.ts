import type { Language } from "@brand/shared";
import type { EmailMessage } from "./transport";

/** Brand accent for emails. Berry until the client picks a direction (decision D1). */
const ACCENT = "#9E1F55";
const TEXT = "#1F1C19";
const MUTED = "#4F4A43";
const BORDER = "#E2DFDA";

export interface EmailContext {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export interface Layout {
  lang: Language;
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** Optional call to action; link emails also print the URL for mail apps that hide buttons. */
  button?: { label: string; url: string };
  fallback?: string;
  closing: string;
  help: string;
}

/** Table layout and inline styles: the only markup every mail app renders the same way. */
export function render(layout: Layout, context: EmailContext): { html: string; text: string } {
  const fonts =
    layout.lang === "hi"
      ? "'Noto Sans Devanagari','Nirmala UI','Kohinoor Devanagari','Mangal',Arial,sans-serif"
      : "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const paragraphs = layout.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:${layout.lang === "hi" ? 28 : 24}px;color:${TEXT};">${escapeHtml(paragraph)}</p>`)
    .join("");
  const buttonHtml = layout.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${ACCENT};">
<a href="${escapeHtml(layout.button.url)}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(layout.button.label)}</a>
</td></tr></table>
${layout.fallback ? `<p style="margin:0 0 8px;font-size:14px;line-height:20px;color:${MUTED};">${escapeHtml(layout.fallback)}</p>
<p style="margin:0 0 24px;font-size:14px;line-height:20px;word-break:break-all;"><a href="${escapeHtml(layout.button.url)}" style="color:${ACCENT};">${escapeHtml(layout.button.url)}</a></p>` : ""}`
    : "";

  const html = `<!doctype html>
<html lang="${layout.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(layout.heading)}</title></head>
<body style="margin:0;padding:0;background:#F7F6F4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(layout.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F4;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:8px;font-family:${fonts};">
<tr><td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
<span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px;background:${ACCENT};color:#FFFFFF;font-weight:600;font-size:15px;">${escapeHtml(context.brandName.charAt(0))}</span>
<span style="font-size:18px;font-weight:600;color:${TEXT};vertical-align:middle;margin-left:8px;">${escapeHtml(context.brandName)}</span>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:600;color:${TEXT};">${escapeHtml(layout.heading)}</h1>
${paragraphs}
${buttonHtml}
<p style="margin:0;font-size:14px;line-height:20px;color:${MUTED};">${escapeHtml(layout.closing)}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid ${BORDER};font-size:13px;line-height:20px;color:${MUTED};">
${escapeHtml(layout.help)} <a href="mailto:${escapeHtml(context.supportEmail)}" style="color:${MUTED};">${escapeHtml(context.supportEmail)}</a> · ${escapeHtml(context.supportPhone)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    layout.heading,
    "",
    ...layout.paragraphs,
    ...(layout.button ? ["", `${layout.button.label}: ${layout.button.url}`] : []),
    "",
    layout.closing,
    "",
    `${layout.help} ${context.supportEmail} · ${context.supportPhone}`,
  ].join("\n");

  return { html, text };
}

interface LinkEmailInput {
  to: string;
  name: string;
  lang: Language;
  url: string;
}

/** "Forgot password" link: 30 minutes, single use (plan W2). */
export function passwordResetEmail(input: LinkEmailInput, context: EmailContext): EmailMessage {
  const name = input.name.split(" ")[0] ?? input.name;
  const copy =
    input.lang === "hi"
      ? {
          subject: `अपना ${context.brandName} पासवर्ड बदलें`,
          preheader: "यह लिंक 30 मिनट तक और एक ही बार काम करेगा।",
          heading: "अपना पासवर्ड बदलें",
          paragraphs: [`नमस्ते ${name},`, "हमें आपका पासवर्ड बदलने का अनुरोध मिला है। नया पासवर्ड चुनने के लिए नीचे दिया बटन दबाएँ। यह लिंक एक ही बार काम करेगा और 30 मिनट में बंद हो जाएगा।"],
          button: "नया पासवर्ड चुनें",
          fallback: "अगर बटन काम न करे, तो यह लिंक अपने ब्राउज़र में खोलें:",
          closing: "अगर आपने यह अनुरोध नहीं किया, तो इस ईमेल को अनदेखा करें। आपका पासवर्ड नहीं बदलेगा।",
          help: "मदद चाहिए?",
        }
      : {
          subject: `Reset your ${context.brandName} password`,
          preheader: "This link works once and expires in 30 minutes.",
          heading: "Reset your password",
          paragraphs: [`Hi ${name},`, "We received a request to reset your password. Use the button below to choose a new one. The link works once and expires in 30 minutes."],
          button: "Choose a new password",
          fallback: "If the button doesn't work, copy this link into your browser:",
          closing: "If you didn't ask for this, you can ignore this email. Your password stays the same.",
          help: "Need help?",
        };
  const { html, text } = render(
    { lang: input.lang, preheader: copy.preheader, heading: copy.heading, paragraphs: copy.paragraphs, button: { label: copy.button, url: input.url }, fallback: copy.fallback, closing: copy.closing, help: copy.help },
    context,
  );
  return { to: input.to, subject: copy.subject, html, text, tag: "password-reset" };
}

/** Contact form acknowledgement in the visitor's language (plan W17). */
export function contactAckEmail(input: { to: string; name: string; lang: Language }, context: EmailContext): EmailMessage {
  const name = input.name.split(" ")[0] ?? input.name;
  const copy =
    input.lang === "hi"
      ? {
          subject: `${context.brandName}: आपका संदेश मिल गया`,
          preheader: "हम एक कामकाजी दिन के अंदर जवाब देंगे।",
          heading: "आपका संदेश मिल गया",
          paragraphs: [`नमस्ते ${name},`, "लिखने के लिए धन्यवाद। हमारी टीम एक कामकाजी दिन के अंदर इसी ईमेल पर जवाब देगी।"],
          closing: "अगर बात ज़रूरी है, तो नीचे दिए नंबर पर कॉल करें।",
          help: "मदद चाहिए?",
        }
      : {
          subject: `${context.brandName}: we've got your message`,
          preheader: "We'll reply within one working day.",
          heading: "We've got your message",
          paragraphs: [`Hi ${name},`, "Thanks for writing to us. Our team will reply to this email within one working day."],
          closing: "If it's urgent, call us on the number below.",
          help: "Need help?",
        };
  const { html, text } = render({ lang: input.lang, preheader: copy.preheader, heading: copy.heading, paragraphs: copy.paragraphs, closing: copy.closing, help: copy.help }, context);
  return { to: input.to, subject: copy.subject, html, text, tag: "contact-ack" };
}

/** Tells the team a new contact message arrived (English; the admin is English-only). */
export function contactAdminEmail(
  input: { to: string; name: string; email: string; phone: string; message: string; id: string },
  context: EmailContext,
): EmailMessage {
  const { html, text } = render(
    {
      lang: "en",
      preheader: input.message.slice(0, 90),
      heading: `New message from ${input.name}`,
      paragraphs: [`From: ${input.name} <${input.email}>${input.phone ? ` · +91 ${input.phone}` : ""}`, input.message],
      closing: `Reply to the sender directly. Message id: ${input.id}`,
      help: "Sent by",
    },
    context,
  );
  return { to: input.to, subject: `${context.brandName} contact: ${input.name}`, html, text, tag: "contact-admin" };
}
