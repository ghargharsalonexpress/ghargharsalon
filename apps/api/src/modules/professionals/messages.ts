import type { Language, PushPayload } from "@brand/shared";

/**
 * Notification texts, in the professional's language (Hindi first, plan A2). The Hindi is a
 * first draft for the native-speaker review (A14).
 */
const TEXT = {
  test: {
    en: { title: "Alerts are working", body: "You'll get job alerts like this one, even when the app is closed." },
    hi: { title: "आपके फ़ोन पर अलर्ट आ रहे हैं", body: "ऐप बंद होने पर भी आपको काम के अलर्ट ऐसे ही मिलेंगे।" },
  },
  offline: {
    en: { title: "You're offline", body: "We lost contact with your phone for 5 minutes. Open the app and go online to get jobs again." },
    hi: { title: "आप ऑफ़लाइन हो गए हैं", body: "5 मिनट तक आपके फ़ोन से संपर्क नहीं हुआ। काम पाने के लिए ऐप खोलें और फिर से ऑनलाइन हों।" },
  },
  verified: {
    en: { title: "You can go online now", body: "Your profile is verified. Open the app and tap Online to start getting jobs." },
    hi: { title: "अब आप ऑनलाइन हो सकते हैं", body: "आपकी प्रोफ़ाइल वेरिफ़ाई हो गई है। काम पाने के लिए ऐप खोलें और Online दबाएँ।" },
  },
} as const;

export function testAlert(locale: Language): PushPayload {
  return { kind: "test", ...TEXT.test[locale], url: "/pro?alert=test", tag: "test" };
}

export function offlineAlert(locale: Language): PushPayload {
  return { kind: "presence-offline", ...TEXT.offline[locale], url: "/pro", tag: "presence" };
}

export function verifiedAlert(locale: Language): PushPayload {
  return { kind: "verified", ...TEXT.verified[locale], url: "/pro", tag: "verified" };
}
