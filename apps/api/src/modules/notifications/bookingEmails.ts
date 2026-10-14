import type { Language } from "@brand/shared";
import { type EmailContext, render } from "../email/templates";
import type { EmailMessage } from "../email/transport";

/** Booking emails (plan C10): transactional, in the customer's language. Hindi is a first draft (A14). */

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

interface BookingEmailInput {
  to: string;
  name: string;
  lang: Language;
  number: string;
  url: string;
}

const first = (name: string) => name.split(" ")[0] ?? name;

function message(input: BookingEmailInput, context: EmailContext, tag: string, copy: { subject: string; preheader: string; heading: string; paragraphs: string[]; button: string; closing: string }): EmailMessage {
  const help = input.lang === "hi" ? "मदद चाहिए?" : "Need help?";
  const { html, text } = render({ lang: input.lang, preheader: copy.preheader, heading: copy.heading, paragraphs: copy.paragraphs, button: { label: copy.button, url: input.url }, closing: copy.closing, help }, context);
  return { to: input.to, subject: copy.subject, html, text, tag };
}

/** A professional accepted (plan C10: "booking confirmed (on accept)"). */
export function bookingConfirmedEmail(input: BookingEmailInput & { professional: string; etaMin: number; etaMax: number }, context: EmailContext): EmailMessage {
  const pro = first(input.professional);
  return message(
    input,
    context,
    "booking-confirmed",
    input.lang === "hi"
      ? {
          subject: `${pro} रास्ते में हैं · ${input.number}`,
          preheader: `लगभग ${input.etaMin}–${input.etaMax} मिनट में पहुँचेंगे।`,
          heading: `${pro} रास्ते में हैं`,
          paragraphs: [`नमस्ते ${first(input.name)},`, `आपकी बुकिंग ${input.number} पक्की हो गई है। ${pro} लगभग ${input.etaMin}–${input.etaMax} मिनट में पहुँचेंगे। आप ऐप में उन्हें नक्शे पर आते देख सकते हैं।`, "सेवा शुरू करने का OTP ऐप में आपकी बुकिंग पर है। इसे सिर्फ़ तब बताएँ जब प्रोफेशनल आपके पास पहुँच जाएँ।"],
          button: "बुकिंग देखें",
          closing: "अगर योजना बदल जाए, तो ऐप से बुकिंग रद्द कर सकते हैं।",
        }
      : {
          subject: `${pro} is on the way · ${input.number}`,
          preheader: `Arriving in about ${input.etaMin}–${input.etaMax} minutes.`,
          heading: `${pro} is on the way`,
          paragraphs: [`Hi ${first(input.name)},`, `Your booking ${input.number} is confirmed. ${pro} should arrive in about ${input.etaMin}–${input.etaMax} minutes. You can follow them on the map in the app.`, "Your start code (OTP) is on your booking in the app. Share it only when your professional is with you."],
          button: "View booking",
          closing: "If your plans change, you can cancel from the booking page.",
        },
  );
}

/** No one accepted in time: the full refund has started (plan W5/W6). */
export function noProfessionalEmail(input: BookingEmailInput & { refundPaise: number }, context: EmailContext): EmailMessage {
  const amount = money(input.refundPaise);
  return message(
    input,
    context,
    "no-professional",
    input.lang === "hi"
      ? {
          subject: `कोई प्रोफेशनल खाली नहीं था · ${amount} का रिफ़ंड शुरू`,
          preheader: "पूरा पैसा उसी तरीक़े में वापस आ रहा है जिससे आपने भुगतान किया था।",
          heading: "माफ़ कीजिए, इस बार कोई खाली नहीं था",
          paragraphs: [`नमस्ते ${first(input.name)},`, `बुकिंग ${input.number} के लिए आस-पास कोई प्रोफेशनल समय पर उपलब्ध नहीं हुआ। हमने ${amount} का पूरा रिफ़ंड शुरू कर दिया है। UPI से आम तौर पर कुछ ही मिनटों में, और कार्ड से 5–7 कामकाजी दिनों में पैसा वापस आ जाता है।`],
          button: "बुकिंग देखें",
          closing: "कुछ देर बाद फिर से बुक करके देखें; अक्सर तब तक कोई खाली हो जाता है।",
        }
      : {
          subject: `No professional was free · ${amount} refund started`,
          preheader: "Your full payment is on its way back to the way you paid.",
          heading: "Sorry, no one was free this time",
          paragraphs: [`Hi ${first(input.name)},`, `No professional nearby could take booking ${input.number} in time. We've started a full refund of ${amount}. UPI refunds usually arrive within minutes; cards can take 5–7 working days.`],
          button: "View booking",
          closing: "Please try again in a little while; someone is often free by then.",
        },
  );
}

/** Cancelled (by anyone), with the fee and the refund (plan W10). */
export function bookingCancelledEmail(input: BookingEmailInput & { feePaise: number; refundPaise: number; byCustomer: boolean }, context: EmailContext): EmailMessage {
  const fee = money(input.feePaise);
  const refund = money(input.refundPaise);
  const hi = input.lang === "hi";
  const refundLine = input.refundPaise > 0 ? (hi ? `${refund} का रिफ़ंड शुरू हो गया है।` : `A refund of ${refund} has started.`) : "";
  const feeLine = input.feePaise > 0 ? (hi ? `कैंसलेशन फ़ीस ${fee} है।` : `The cancellation fee is ${fee}.`) : "";
  return message(
    input,
    context,
    "booking-cancelled",
    hi
      ? {
          subject: `बुकिंग रद्द हुई · ${input.number}`,
          preheader: refundLine || "आपकी बुकिंग रद्द कर दी गई है।",
          heading: "आपकी बुकिंग रद्द हो गई",
          paragraphs: [`नमस्ते ${first(input.name)},`, `${input.byCustomer ? "आपके कहने पर" : "हमने"} बुकिंग ${input.number} रद्द ${input.byCustomer ? "कर दी गई है" : "कर दी है"}। ${feeLine} ${refundLine}`.trim()],
          button: "बुकिंग देखें",
          closing: "कोई सवाल हो, तो नीचे दिए नंबर पर कॉल करें।",
        }
      : {
          subject: `Booking cancelled · ${input.number}`,
          preheader: refundLine || "Your booking has been cancelled.",
          heading: "Your booking is cancelled",
          paragraphs: [`Hi ${first(input.name)},`, `${input.byCustomer ? "As you asked, booking" : "We've cancelled booking"} ${input.number}${input.byCustomer ? " is cancelled" : ""}. ${feeLine} ${refundLine}`.trim()],
          button: "View booking",
          closing: "Questions? Call us on the number below.",
        },
  );
}

/** Done: the receipt link and a request for a rating (plan W9). */
export function bookingCompletedEmail(input: BookingEmailInput & { totalPaise: number; professional: string; invoiceUrl: string }, context: EmailContext): EmailMessage {
  const total = money(input.totalPaise);
  const pro = first(input.professional);
  return message(
    input,
    context,
    "booking-completed",
    input.lang === "hi"
      ? {
          subject: `धन्यवाद · ${input.number} पूरी हुई`,
          preheader: `कुल ${total}। ${pro} की सेवा कैसी रही?`,
          heading: "आपकी सेवा पूरी हुई",
          paragraphs: [`नमस्ते ${first(input.name)},`, `बुकिंग ${input.number} पूरी हो गई। कुल भुगतान ${total}।`, `${pro} की सेवा कैसी रही? आपकी रेटिंग दूसरे लोगों और हमारी टीम, दोनों के काम आती है।`, `इनवॉइस: ${input.invoiceUrl}`],
          button: "रेटिंग दें",
          closing: "हमें चुनने के लिए धन्यवाद।",
        }
      : {
          subject: `Thank you · ${input.number} is complete`,
          preheader: `Total ${total}. How was ${pro}?`,
          heading: "Your service is complete",
          paragraphs: [`Hi ${first(input.name)},`, `Booking ${input.number} is complete. Total paid: ${total}.`, `How was ${pro}? Your rating helps other customers and our team.`, `Invoice: ${input.invoiceUrl}`],
          button: "Rate your experience",
          closing: "Thank you for choosing us.",
        },
  );
}

/** Alerts for the operations team (plan C10); English, like the admin. */
export function adminAlertEmail(input: { to: string; title: string; detail: string; url: string }, context: EmailContext): EmailMessage {
  const { html, text } = render({ lang: "en", preheader: input.detail, heading: input.title, paragraphs: [input.detail], button: { label: "Open in admin", url: input.url }, closing: "Sent automatically by the booking system.", help: "Alerts go to" }, context);
  return { to: input.to, subject: `[${context.brandName}] ${input.title}`, html, text, tag: "admin-alert" };
}
