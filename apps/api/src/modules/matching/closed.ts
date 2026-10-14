import { type Language, type PushPayload, RT } from "@brand/shared";
import type { Types } from "mongoose";
import type { PushService } from "../professionals/push";
import { realtime } from "../realtime/realtime";
import { User } from "../users/user.model";
import type { OfferDoc } from "./offer.model";

function closedPush(bookingId: Types.ObjectId, lang: Language, reason: "taken" | "revoked"): PushPayload {
  return {
    kind: "offer-closed",
    title: lang === "hi" ? (reason === "taken" ? "काम किसी और ने ले लिया" : "यह काम रद्द हो गया") : reason === "taken" ? "Job taken" : "Job cancelled",
    body: lang === "hi" ? "अगला अलर्ट जल्द आएगा।" : "Your next alert will come soon.",
    url: "/pro",
    // Same tag as the alert: replaces it on the lock screen.
    tag: `offer:${String(bookingId)}`,
  };
}

/**
 * Tells each professional whose job alert just closed (plan C6): taken by someone else, the
 * booking cancelled or the search over. The alert screen updates at once and stops ringing; the
 * lock-screen alert is replaced, unless it simply ran out of time.
 */
export async function notifyOffersClosed(push: PushService, offers: Array<Pick<OfferDoc, "_id" | "professionalId" | "bookingId">>, reason: "taken" | "revoked" | "expired"): Promise<void> {
  for (const offer of offers) {
    realtime.toUser(offer.professionalId, RT.offerClosed, { offerId: String(offer._id), bookingId: String(offer.bookingId), reason });
    if (reason === "expired") continue;
    const pro = await User.findById(offer.professionalId, { locale: 1 }).lean();
    await push.sendToUser(offer.professionalId, closedPush(offer.bookingId, pro?.locale ?? "hi", reason), { ttlSeconds: 60, urgency: "high" }).catch(() => undefined);
  }
}
